import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// GET /api/dashboard
// Retourne les stats du dashboard agency :
//   - activeClients, totalPosts, publishedThisMonth, publicationRate
//   - clientPerformance (per client: totalPosts, pending, publishedThisMonth, monthlyGoal)
//   - recentActivity (last 10 posts with status)
// ============================================================
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    // ─── Stats globales ───
    const [clients, allPosts] = await Promise.all([
      db.client.findMany({
        where: { userId, active: true },
        include: {
          posts: {
            orderBy: { createdAt: 'desc' },
            select: { id: true, status: true, publishedAt: true, createdAt: true, title: true, clientId: true },
          },
        },
      }),
      db.postProposal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, title: true, status: true, publishedAt: true, createdAt: true, clientId: true },
      }),
    ])

    // Stats globales
    const activeClients = clients.length
    const totalPosts = clients.reduce((acc, c) => acc + c.posts.length, 0)

    // Posts publiés ce mois
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const publishedThisMonth = clients.reduce((acc, c) => {
      return acc + c.posts.filter(p =>
        p.status === 'published' &&
        p.publishedAt &&
        new Date(p.publishedAt) >= monthStart &&
        new Date(p.publishedAt) <= monthEnd
      ).length
    }, 0)

    // Objectif mensuel global
    const monthlyGoal = clients.reduce((acc, c) => acc + c.monthlyGoal, 0)

    // Taux de publication (sur tous les posts créés, % publiés)
    const totalPublished = clients.reduce((acc, c) => acc + c.posts.filter(p => p.status === 'published').length, 0)
    const publicationRate = totalPosts > 0 ? Math.round((totalPublished / totalPosts) * 100) : 0

    // ─── Performance par client ───
    const clientPerformance = clients.map(c => {
      const cPublishedThisMonth = c.posts.filter(p =>
        p.status === 'published' &&
        p.publishedAt &&
        new Date(p.publishedAt) >= monthStart &&
        new Date(p.publishedAt) <= monthEnd
      ).length
      const cPending = c.posts.filter(p => p.status === 'pending' || p.status === 'approved').length

      return {
        id: c.id,
        name: c.name,
        color: c.color,
        totalPosts: c.posts.length,
        pending: cPending,
        publishedThisMonth: cPublishedThisMonth,
        monthlyGoal: c.monthlyGoal,
        goalProgress: c.monthlyGoal > 0 ? Math.round((cPublishedThisMonth / c.monthlyGoal) * 100) : 0,
        createdAt: c.createdAt,
      }
    })

    // ─── Activité récente ───
    const recentActivity = allPosts.map(p => ({
      id: p.id,
      title: p.title,
      status: p.status,
      publishedAt: p.publishedAt,
      createdAt: p.createdAt,
      clientId: p.clientId,
    }))

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          activeClients,
          totalPosts,
          publishedThisMonth,
          monthlyGoal,
          publicationRate,
        },
        clientPerformance,
        recentActivity,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/dashboard]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
