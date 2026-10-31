import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// GET /api/admin/stats
// Statistiques globales (admin only)
// ============================================================
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérifier que l'user est admin
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Accès refusé. Admin uniquement.' },
        { status: 403 }
      )
    }

    // Récupérer les stats agrégées
    const [
      totalUsers,
      usersByPlan,
      newUsersThisWeek,
      activeSubscriptions,
      totalPosts,
      publishedPosts,
      totalLinkedInAccounts,
      totalTeams,
      recentUsers,
      payingUsers,
    ] = await Promise.all([
      db.user.count(),
      db.user.groupBy({
        by: ['plan'],
        _count: true,
      }),
      db.user.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      db.user.count({
        where: { stripeSubscriptionStatus: 'active' },
      }),
      db.postProposal.count(),
      db.postProposal.count({ where: { status: 'published' } }),
      db.linkedInAccount.count({ where: { status: 'active' } }),
      db.team.count(),
      db.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          createdAt: true,
          trialEndsAt: true,
          stripeSubscriptionStatus: true,
        },
      }),
      db.user.findMany({
        where: { plan: { in: ['pro', 'business'] }, stripeSubscriptionStatus: 'active' },
        select: { plan: true },
      }),
    ])

    const revenueMonthly = payingUsers.reduce((acc, u) => {
      return acc + (u.plan === 'business' ? 79 : 29)
    }, 0)

    return NextResponse.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          byPlan: usersByPlan.reduce((acc, p) => ({ ...acc, [p.plan]: p._count }), {}),
          newThisWeek: newUsersThisWeek,
          activeSubscriptions,
          recent: recentUsers,
        },
        content: {
          totalPosts,
          publishedPosts,
          linkedinAccounts: totalLinkedInAccounts,
        },
        teams: totalTeams,
        revenue: {
          monthlyEstimated: revenueMonthly,
          currency: 'EUR',
        },
      },
    })
  } catch (error: any) {
    console.error('[GET /api/admin/stats]', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
