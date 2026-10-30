import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { syncEngagementMetrics } from '@/lib/linkedin'

// ============================================================
// POST /api/linkedin/analytics
// Déclenche une sync manuelle des analytics LinkedIn pour l'user
// (peut aussi être appelé par le cron Render)
// ============================================================
export async function POST(request: Request) {
  try {
    // Authentification : soit via cookie session (user), soit via
    // header CRON_SECRET (cron Render)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    let userId: string | null = null

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      // Mode cron : on sync tous les users
      const { db } = await import('@/lib/db')
      const users = await db.user.findMany({ select: { id: true } })
      let totalSynced = 0
      let totalErrors = 0
      for (const u of users) {
        const result = await syncEngagementMetrics(u.id)
        totalSynced += result.synced
        totalErrors += result.errors
      }
      return NextResponse.json({
        success: true,
        data: { users: users.length, synced: totalSynced, errors: totalErrors },
      })
    }

    // Mode user : on sync l'user courant
    userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const result = await syncEngagementMetrics(userId)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error('[POST /api/linkedin/analytics]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
