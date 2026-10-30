import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { syncEngagementMetrics } from '@/lib/linkedin'
import { logger } from '@/lib/logger'

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
    logger.error({ route: 'cron/sync-analytics' }, 'CRON_SECRET not configured')
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn({ route: 'cron/sync-analytics', authHeader: authHeader?.substring(0, 20) }, 'Unauthorized cron access')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const startTime = Date.now()
  logger.info({ route: 'cron/sync-analytics' }, 'Cron sync-analytics started')

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
      logger.error({ err: err.message, userId: user.id }, 'Error syncing user analytics')
      totalErrors++
    }
  }

  const durationMs = Date.now() - startTime
  logger.info({
    route: 'cron/sync-analytics',
    usersProcessed,
    postsSynced: totalSynced,
    errors: totalErrors,
    durationMs,
  }, 'Cron sync-analytics done')

  return NextResponse.json({
    success: true,
    data: {
      usersProcessed,
      postsSynced: totalSynced,
      errors: totalErrors,
      durationMs,
      timestamp: new Date().toISOString(),
    },
  })
}
