import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyApiKey } from '@/lib/api-keys'
import { applyRateLimit, rateLimitHeaders } from '@/lib/rate-limit'

// ============================================================
// GET /api/v1/stats
// API PUBLIQUE - Statistiques agrégées de l'utilisateur
//
// Query params :
//   ?days=14 (1-365, selon le plan)
// ============================================================
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const auth = await verifyApiKey(authHeader)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'API key invalide ou manquante' },
        { status: 401 }
      )
    }

    const rl = applyRateLimit(request, 'api-v1', { limit: 60, windowMs: 60 * 1000 }, auth.userId)
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders(rl) }
      )
    }

    // Récupérer le plan pour déterminer la fenêtre
    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { plan: true, trialEndsAt: true },
    })

    const trialActive = user?.trialEndsAt ? new Date(user.trialEndsAt) > new Date() : false
    const effectivePlan = trialActive ? 'pro' : (user?.plan || 'free')
    const daysByPlan: Record<string, number> = { free: 14, pro: 90, business: 365 }
    const maxDays = daysByPlan[effectivePlan] || 14

    const { searchParams } = new URL(request.url)
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '14'), 1), maxDays)

    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)
    const fromDateStr = fromDate.toISOString().split('T')[0]

    const [metrics, postsCount, publishedCount] = await Promise.all([
      db.engagementMetric.findMany({
        where: { userId: auth.userId, date: { gte: fromDateStr } },
        orderBy: { date: 'asc' },
      }),
      db.postProposal.count({ where: { userId: auth.userId } }),
      db.postProposal.count({ where: { userId: auth.userId, status: 'published' } }),
    ])

    const totals = metrics.reduce(
      (acc, m) => ({
        likes: acc.likes + m.likes,
        comments: acc.comments + m.comments,
        shares: acc.shares + m.shares,
        views: acc.views + m.views,
        clicks: acc.clicks + m.clicks,
      }),
      { likes: 0, comments: 0, shares: 0, views: 0, clicks: 0 }
    )

    return NextResponse.json({
      success: true,
      data: {
        period: { days, from: fromDateStr, to: new Date().toISOString().split('T')[0] },
        totals,
        posts: {
          total: postsCount,
          published: publishedCount,
          pending: postsCount - publishedCount,
        },
        daily: metrics,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/v1/stats]', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
