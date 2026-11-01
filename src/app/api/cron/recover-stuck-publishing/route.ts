import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { verifyCronAuth, getCronSecret } from '@/lib/cron-secret'

// ============================================================
// GET /api/cron/recover-stuck-publishing
// Cron de récupération des propositions bloquées en 'publishing'
//
// Règles:
//   - status='publishing' + updatedAt < now - 15min → remettre à 'approved'
//     (le publish a probablement échoué silencieusement, on permet un retry)
//   - status='publishing' + updatedAt < now - 1h → marquer 'failed'
//     (trop vieux, probablement un crash irrécupérable)
//
// ⚠️ Protégé par CRON_SECRET (ou dérivé de JWT_SECRET)
// ============================================================

const RECOVERY_THRESHOLD_MS = 15 * 60 * 1000 // 15 minutes
const FAILURE_THRESHOLD_MS = 60 * 60 * 1000 // 1 hour

export async function GET(request: Request) {
  const secret = getCronSecret()
  if (!secret) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  if (!verifyCronAuth(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const now = new Date()
  const recoveryThreshold = new Date(now.getTime() - RECOVERY_THRESHOLD_MS)
  const failureThreshold = new Date(now.getTime() - FAILURE_THRESHOLD_MS)

  logger.info({ route: 'cron/recover-stuck-publishing' }, 'Recovery cron started')

  let recovered = 0
  let failed = 0
  let errors = 0

  try {
    // 1. Find proposals stuck in 'publishing' for more than 1 hour → mark as failed
    const stuckFailed = await db.postProposal.findMany({
      where: {
        status: 'publishing',
        updatedAt: { lt: failureThreshold },
        userId: { not: null },
      },
      select: { id: true, userId: true, title: true },
    })

    for (const proposal of stuckFailed) {
      try {
        await db.postProposal.update({
          where: { id: proposal.id },
          data: {
            status: 'failed',
            errorMessage: 'Publication bloquée (timeout > 1h). Probable crash du serveur durante la publication.',
          },
        })
        failed++

        // Notify the user (userId is guaranteed non-null by the where clause)
        if (proposal.userId) {
          await db.notification.create({
            data: {
              userId: proposal.userId,
              type: 'linkedin',
              title: 'Publication échouée (timeout)',
              message: `Le post "${proposal.title.slice(0, 50)}" est resté bloqué en publication. Réessayez manuellement.`,
              link: '/?tab=proposals',
            },
          }).catch(() => {})
        }
      } catch (err) {
        errors++
        logger.error({ err: (err as Error).message, proposalId: proposal.id }, 'Failed to mark stuck proposal as failed')
      }
    }

    // 2. Find proposals stuck in 'publishing' for 15min-1h → reset to 'approved' for retry
    const stuckRecoverable = await db.postProposal.findMany({
      where: {
        status: 'publishing',
        updatedAt: {
          lt: recoveryThreshold,
          gte: failureThreshold,
        },
      },
      select: { id: true, userId: true, title: true },
    })

    for (const proposal of stuckRecoverable) {
      try {
        await db.postProposal.update({
          where: { id: proposal.id },
          data: {
            status: 'approved',
            errorMessage: 'Publication interrompue (récupération automatique). Vous pouvez réessayer.',
          },
        })
        recovered++
      } catch (err) {
        errors++
        logger.error({ err: (err as Error).message, proposalId: proposal.id }, 'Failed to recover stuck proposal')
      }
    }

    const durationMs = Date.now() - startTime
    logger.info({
      route: 'cron/recover-stuck-publishing',
      recovered,
      failed,
      errors,
      durationMs,
    }, 'Recovery cron done')

    return NextResponse.json({
      success: true,
      data: {
        recovered,
        failed,
        errors,
        durationMs,
      },
    })
  } catch (error: any) {
    logger.error({
      err: error.message,
      route: 'cron/recover-stuck-publishing',
    }, 'Recovery cron failed')
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
