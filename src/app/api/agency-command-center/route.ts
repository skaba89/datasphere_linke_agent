import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// GET /api/agency-command-center
// Agency Command Center — KPIs avancés multi-clients
//
// Plan gating : Business + (les agences ont typiquement plusieurs clients)
//
// Retourne :
//   - globalKpis : total clients, posts, taux publication, taux succès
//   - topClients : top 5 par engagement/progression
//   - laggingClients : clients en retard sur leur objectif mensuel
//   - weeklyTrend : posts publiés par jour sur 14j
//   - statusHealth : distribution des statuts (pending/approved/published/failed)
//   - alerts : clients sans post depuis 7j, échecs récents
// ============================================================

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const user = await db.user.findUnique({ where: { id: userId }, select: { plan: true, role: true } })
    const plan = (user?.plan || 'free').toLowerCase()
    const isAdmin = user?.role === 'admin'
    if (!isAdmin && plan !== 'business' && plan !== 'agency') {
      return NextResponse.json(
        { success: false, error: 'Agency Command Center est réservé aux plans Business et Agency.' },
        { status: 403 }
      )
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const daysAgo14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const daysAgo7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const clients = await db.client.findMany({
      where: { userId },
      include: {
        posts: {
          select: {
            id: true, status: true, publishedAt: true, createdAt: true,
            engagementEst: true, title: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    if (clients.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          globalKpis: {
            totalClients: 0, totalPosts: 0, publishedThisMonth: 0,
            monthlyGoal: 0, publicationRate: 0, successRate: 0,
          },
          topClients: [],
          laggingClients: [],
          weeklyTrend: [],
          statusHealth: {},
          alerts: [],
        },
      })
    }

    // ─── Global KPIs ───
    const totalPosts = clients.reduce((s, c) => s + c.posts.length, 0)
    const publishedThisMonth = clients.reduce((s, c) => s + c.posts.filter(p =>
      p.status === 'published' && p.publishedAt &&
      new Date(p.publishedAt) >= monthStart && new Date(p.publishedAt) <= monthEnd
    ).length, 0)
    const monthlyGoal = clients.reduce((s, c) => s + c.monthlyGoal, 0)
    const totalPublished = clients.reduce((s, c) => s + c.posts.filter(p => p.status === 'published').length, 0)
    const totalFailed = clients.reduce((s, c) => s + c.posts.filter(p => p.status === 'failed').length, 0)
    const publicationRate = totalPosts > 0 ? Math.round((totalPublished / totalPosts) * 100) : 0
    const successRate = (totalPublished + totalFailed) > 0
      ? Math.round((totalPublished / (totalPublished + totalFailed)) * 100)
      : 100

    // ─── Top clients (by published count this month) ───
    const clientStats = clients.map(c => {
      const publishedThisMonth = c.posts.filter(p =>
        p.status === 'published' && p.publishedAt &&
        new Date(p.publishedAt) >= monthStart && new Date(p.publishedAt) <= monthEnd
      ).length
      const pending = c.posts.filter(p => p.status === 'pending' || p.status === 'approved').length
      const failed = c.posts.filter(p => p.status === 'failed').length
      const lastPostAt = c.posts
        .filter(p => p.publishedAt)
        .map(p => new Date(p.publishedAt!))
        .sort((a, b) => b.getTime() - a.getTime())[0] || null
      const goalProgress = c.monthlyGoal > 0 ? Math.round((publishedThisMonth / c.monthlyGoal) * 100) : 0

      return {
        id: c.id,
        name: c.name,
        color: c.color,
        active: c.active,
        totalPosts: c.posts.length,
        publishedThisMonth,
        pending,
        failed,
        monthlyGoal: c.monthlyGoal,
        goalProgress,
        lastPostAt: lastPostAt ? lastPostAt.toISOString() : null,
      }
    })

    const topClients = [...clientStats]
      .filter(c => c.active)
      .sort((a, b) => b.publishedThisMonth - a.publishedThisMonth || b.goalProgress - a.goalProgress)
      .slice(0, 5)

    // ─── Lagging clients (< 50% of monthly goal) ───
    const laggingClients = clientStats
      .filter(c => c.active && c.monthlyGoal > 0 && c.goalProgress < 50)
      .sort((a, b) => a.goalProgress - b.goalProgress)

    // ─── Weekly trend (last 14 days, posts published per day) ───
    const weeklyTrend: { date: string; count: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStr = day.toISOString().split('T')[0]
      const count = clients.reduce((s, c) => s + c.posts.filter(p =>
        p.publishedAt && new Date(p.publishedAt).toISOString().split('T')[0] === dayStr
      ).length, 0)
      weeklyTrend.push({ date: dayStr, count })
    }

    // ─── Status health ───
    const statusHealth: Record<string, number> = {}
    for (const c of clients) {
      for (const p of c.posts) {
        statusHealth[p.status] = (statusHealth[p.status] || 0) + 1
      }
    }

    // ─── Alerts ───
    const alerts: Array<{ type: string; severity: string; clientId: string; clientName: string; message: string }> = []
    for (const c of clientStats) {
      if (!c.active) continue
      // No post in last 7 days
      if (!c.lastPostAt || new Date(c.lastPostAt) < daysAgo7) {
        alerts.push({
          type: 'no_recent_post',
          severity: 'warning',
          clientId: c.id,
          clientName: c.name,
          message: `Aucun post publié depuis +7 jours pour ${c.name}`,
        })
      }
      // Failed posts > 0
      if (c.failed > 0) {
        alerts.push({
          type: 'failed_posts',
          severity: 'critical',
          clientId: c.id,
          clientName: c.name,
          message: `${c.failed} post(s) en échec pour ${c.name}`,
        })
      }
      // Goal < 25% and we're past mid-month
      const isPastMidMonth = now.getDate() > 15
      if (isPastMidMonth && c.monthlyGoal > 0 && c.goalProgress < 25) {
        alerts.push({
          type: 'goal_behind',
          severity: 'warning',
          clientId: c.id,
          clientName: c.name,
          message: `${c.name} n'a atteint que ${c.goalProgress}% de son objectif mensuel`,
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        globalKpis: {
          totalClients: clients.length,
          activeClients: clients.filter(c => c.active).length,
          totalPosts,
          publishedThisMonth,
          monthlyGoal,
          publicationRate,
          successRate,
        },
        topClients,
        laggingClients,
        weeklyTrend,
        statusHealth,
        alerts,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/agency-command-center]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
