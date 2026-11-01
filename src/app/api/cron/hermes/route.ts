import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { verifyCronAuth, getCronSecret } from '@/lib/cron-secret'
import { runHermesForUser } from '@/lib/hermes'

// ============================================================
// GET /api/cron/hermes
// Cron périodique qui déclenche Hermes pour tous les users
// ayant HermesConfig.enabled = true
//
// ⚠️ Protégé par CRON_SECRET (ou dérivé de JWT_SECRET)
//
// Note: La cadence réelle est contrôlée par cron-job.org.
// Le champ HermesConfig.scheduleCron est informatif seulement.
// ============================================================

export async function GET(request: Request) {
  const secret = getCronSecret()
  if (!secret) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  if (!verifyCronAuth(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  logger.info({ route: 'cron/hermes' }, 'Hermes cron started')

  // Récupérer tous les users avec Hermes activé
  const configs = await db.hermesConfig.findMany({
    where: { enabled: true },
    select: { userId: true },
  })

  let totalRuns = 0
  let successCount = 0
  let partialCount = 0
  let failedCount = 0
  let errors = 0

  for (const config of configs) {
    try {
      const result = await runHermesForUser(config.userId, 'cron')
      totalRuns++
      if (result.status === 'success') successCount++
      else if (result.status === 'partial') partialCount++
      else failedCount++
    } catch (err: any) {
      errors++
      logger.error({
        err: err.message,
        userId: config.userId,
      }, 'Hermes cron failed for user')
    }
  }

  const durationMs = Date.now() - startTime
  logger.info({
    route: 'cron/hermes',
    totalRuns,
    successCount,
    partialCount,
    failedCount,
    errors,
    durationMs,
  }, 'Hermes cron done')

  return NextResponse.json({
    success: true,
    data: {
      totalRuns,
      successCount,
      partialCount,
      failedCount,
      errors,
      durationMs,
    },
  })
}
