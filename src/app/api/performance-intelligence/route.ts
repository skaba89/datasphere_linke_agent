import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { generateChat } from '@/lib/ai-providers'

// ============================================================
// GET /api/performance-intelligence
// LinkedIn Performance Intelligence
//
// Agrège les données de performance de l'utilisateur :
//   - KPIs globaux (14j, 30j, 90j)
//   - Top posts par engagement
//   - Meilleurs créneaux (jour + heure) basés sur publishedAt + EngagementMetric
//   - Recommandations de contenu générées par IA (P3)
//
// Plan gating : tous les plans (Free inclus) ont accès aux KPIs de base.
// Les recommandations IA sont Pro+.
// ============================================================

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const now = new Date()
    const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)

    // 1. Posts with engagement
    const [posts14, posts30, posts90] = await Promise.all([
      db.postProposal.findMany({
        where: { userId, status: 'published', publishedAt: { gte: daysAgo(14) } },
        select: { id: true, title: true, content: true, publishedAt: true, engagementEst: true },
        orderBy: { publishedAt: 'desc' },
      }),
      db.postProposal.findMany({
        where: { userId, status: 'published', publishedAt: { gte: daysAgo(30) } },
        select: { id: true, title: true, content: true, publishedAt: true, engagementEst: true },
        orderBy: { publishedAt: 'desc' },
      }),
      db.postProposal.findMany({
        where: { userId, status: 'published', publishedAt: { gte: daysAgo(90) } },
        select: { id: true, title: true, content: true, publishedAt: true, engagementEst: true },
        orderBy: { publishedAt: 'desc' },
      }),
    ])

    // 2. Engagement metrics
    const [metrics14, metrics30, metrics90] = await Promise.all([
      db.engagementMetric.findMany({ where: { userId, date: { gte: daysAgo(14).toISOString().split('T')[0] } } }),
      db.engagementMetric.findMany({ where: { userId, date: { gte: daysAgo(30).toISOString().split('T')[0] } } }),
      db.engagementMetric.findMany({ where: { userId, date: { gte: daysAgo(90).toISOString().split('T')[0] } } }),
    ])

    const aggregateMetrics = (ms: typeof metrics14) => ({
      likes: ms.reduce((s, m) => s + m.likes, 0),
      comments: ms.reduce((s, m) => s + m.comments, 0),
      shares: ms.reduce((s, m) => s + m.shares, 0),
      views: ms.reduce((s, m) => s + m.views, 0),
      clicks: ms.reduce((s, m) => s + m.clicks, 0),
    })

    const kpis = {
      d14: { posts: posts14.length, ...aggregateMetrics(metrics14) },
      d30: { posts: posts30.length, ...aggregateMetrics(metrics30) },
      d90: { posts: posts90.length, ...aggregateMetrics(metrics90) },
    }

    // 3. Best time analysis (from publishedAt)
    const allPublished = posts90
    const dayCount: Record<string, number> = {}
    const hourCount: Record<string, number> = {}
    const dayEngagement: Record<string, number> = {}
    const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

    for (const p of allPublished) {
      const d = new Date(p.publishedAt || new Date())
      const day = DAYS_FR[d.getDay()]
      const hour = `${d.getHours()}h`
      dayCount[day] = (dayCount[day] || 0) + 1
      hourCount[hour] = (hourCount[hour] || 0) + 1
      // Try to extract engagement number
      const match = (p.engagementEst || '').match(/(\d+)/)
      if (match) dayEngagement[day] = (dayEngagement[day] || 0) + parseInt(match[1], 10)
    }

    const bestDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null
    const bestHour = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null

    // 4. Top posts by engagement (using title length + content length as proxy if no real metrics)
    const topPosts = [...posts90]
      .sort((a, b) => (b.engagementEst || '').length - (a.engagementEst || '').length)
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        title: p.title,
        preview: p.content.slice(0, 120) + (p.content.length > 120 ? '...' : ''),
        publishedAt: p.publishedAt?.toISOString() || null,
        engagement: p.engagementEst || 'N/A',
      }))

    // 5. Content velocity (posts per week)
    const weeksIn90 = 90 / 7
    const postsPerWeek = posts90.length / weeksIn90

    // 6. Status distribution
    const statusBreakdown = await db.postProposal.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    })
    const statusDist = statusBreakdown.reduce<Record<string, number>>((acc, s) => {
      acc[s.status] = s._count
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      data: {
        kpis,
        bestTime: { day: bestDay, hour: bestHour, dayDistribution: dayCount, hourDistribution: hourCount },
        topPosts,
        contentVelocity: {
          postsPerWeek: Number(postsPerWeek.toFixed(2)),
          total90Days: posts90.length,
          trend: posts14.length >= posts30.length / 2 ? 'up' : posts14.length > 0 ? 'stable' : 'down',
        },
        statusDistribution: statusDist,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/performance-intelligence]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// ============================================================
// POST /api/performance-intelligence
// Generate AI recommendations based on user's performance data
// ============================================================
export async function POST() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    // Plan gating: Pro+ for AI recommendations
    const user = await db.user.findUnique({ where: { id: userId }, select: { plan: true, role: true } })
    const plan = (user?.plan || 'free').toLowerCase()
    const isAdmin = user?.role === 'admin'
    if (!isAdmin && plan !== 'pro' && plan !== 'business' && plan !== 'agency') {
      return NextResponse.json(
        { success: false, error: 'Les recommandations IA sont réservées aux plans Pro et supérieurs.' },
        { status: 403 }
      )
    }

    // Fetch the data we need
    const now = new Date()
    const daysAgo30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const daysAgo90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    const [posts30, posts90, metrics30] = await Promise.all([
      db.postProposal.findMany({
        where: { userId, status: 'published', publishedAt: { gte: daysAgo30 } },
        select: { title: true, content: true, hashtags: true, format: true, angle: true, publishedAt: true, engagementEst: true },
        orderBy: { publishedAt: 'desc' },
        take: 10,
      }),
      db.postProposal.findMany({
        where: { userId, status: 'published', publishedAt: { gte: daysAgo90 } },
        select: { title: true, format: true, angle: true, engagementEst: true },
        orderBy: { publishedAt: 'desc' },
      }),
      db.engagementMetric.findMany({
        where: { userId, date: { gte: daysAgo30.toISOString().split('T')[0] } },
      }),
    ])

    const totalLikes = metrics30.reduce((s, m) => s + m.likes, 0)
    const totalComments = metrics30.reduce((s, m) => s + m.comments, 0)
    const totalShares = metrics30.reduce((s, m) => s + m.shares, 0)
    const totalViews = metrics30.reduce((s, m) => s + m.views, 0)
    const engagementRate = totalViews > 0 ? ((totalLikes + totalComments + totalShares) / totalViews * 100).toFixed(2) : '0'

    // Top performing formats
    const formatCounts: Record<string, number> = {}
    for (const p of posts90) {
      if (p.format) formatCounts[p.format] = (formatCounts[p.format] || 0) + 1
    }
    const topFormats = Object.entries(formatCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f]) => f)

    // Build prompt
    const recentTitles = posts30.slice(0, 5).map(p => `- ${p.title} (${p.format || 'N/A'}, ${p.engagementEst || 'N/A'})`).join('\n') || 'Aucun post récent'

    const result = await generateChat({
      system: `Tu es un expert LinkedIn Performance Intelligence. Tu analyses les données de performance d'un créateur et tu génères des recommandations actionnables.

Réponds UNIQUEMENT en JSON valide :
{
  "score": 0-100,
  "summary": "résumé court (1-2 phrases) de la performance globale",
  "strengths": ["3 forces identifiées"],
  "weaknesses": ["3 axes d'amélioration"],
  "recommendations": [
    {
      "category": "fréquence | format | timing | contenu | engagement",
      "title": "titre court de la reco",
      "description": "description actionnable",
      "priority": "haute | moyenne | basse"
    }
  ],
  "nextSteps": ["3 prochaines actions concrètes à faire cette semaine"],
  "contentIdeas": ["3 idées de posts basées sur ce qui marche"]
}`,
      user: `Analyse les performances LinkedIn des 30 derniers jours :

Métriques (30 jours) :
- Posts publiés : ${posts30.length}
- Vues : ${totalViews}
- Likes : ${totalLikes}
- Commentaires : ${totalComments}
- Partages : ${totalShares}
- Taux d'engagement : ${engagementRate}%
- Top formats utilisés (90j) : ${topFormats.join(', ') || 'N/A'}

Posts récents :
${recentTitles}

Génère un plan d'action complet.`,
      temperature: 0.6,
      maxTokens: 1500,
    })

    let parsed
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
      else parsed = { raw: result.content }
    } catch { parsed = { raw: result.content } }

    return NextResponse.json({
      success: true,
      data: parsed,
      provider: result.provider,
      meta: {
        analyzedPosts: posts30.length,
        engagementRate: `${engagementRate}%`,
        topFormats,
      },
    })
  } catch (error: any) {
    console.error('[POST /api/performance-intelligence]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
