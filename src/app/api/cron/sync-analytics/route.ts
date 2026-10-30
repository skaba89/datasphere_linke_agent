import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { syncEngagementMetrics } from '@/lib/linkedin'

// ============================================================
// GET /api/cron/sync-analytics
// Cron job Render (toutes les heures) pour sync analytics
// de tous les utilisateurs ayant un compte LinkedIn actif.
//
// ⚠️ Protégé par CRON_SECRET (header Authorization: Bearer XXX)
//
// Render cron config :
//   Schedule: "0 * * * *" (toutes les heures)
//   URL: https://VOTRE-APP.onrender.com/api/cron/sync-analytics
//   Headers: Authorization: Bearer ${CRON_SECRET}
// ============================================================
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET not configured')
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  console.log('[CRON] sync-analytics started at', new Date().toISOString())

  // Récupérer tous les users avec un compte LinkedIn actif
  const usersWithLinkedIn = await db.user.findMany({
    where: {
      linkedinAccounts: { some: { status: 'active' } },
    },
    select: { id: true },
  })

  let totalSynced = 0
  let totalErrors = 0
  let usersProcessed = 0

  for (const user of usersWithLinkedIn) {
    try {
      const result = await syncEngagementMetrics(user.id)
      totalSynced += result.synced
      totalErrors += result.errors
      usersProcessed++
    } catch (err: any) {
      console.error(`[CRON] Error syncing user ${user.id}:`, err.message)
      totalErrors++
    }
  }

  console.log(
    `[CRON] sync-analytics done: ${usersProcessed} users, ${totalSynced} posts synced, ${totalErrors} errors`
  )

  return NextResponse.json({
    success: true,
    data: {
      usersProcessed,
      postsSynced: totalSynced,
      errors: totalErrors,
      timestamp: new Date().toISOString(),
    },
  })
}
