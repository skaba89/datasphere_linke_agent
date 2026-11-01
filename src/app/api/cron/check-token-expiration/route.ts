import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { verifyCronAuth, getCronSecret } from '@/lib/cron-secret'

// ============================================================
// GET /api/cron/check-token-expiration
// Cron quotidien qui vérifie l'expiration des tokens LinkedIn
//
// Règles:
//   - tokenExpiresAt < now → marquer le compte 'expired' + notification
//   - tokenExpiresAt < now + 7 jours → notification d'avertissement
//   - tokenExpiresAt < now + 1 jour → notification urgente
//
// ⚠️ Protégé par CRON_SECRET
// ============================================================

const WARNING_THRESHOLD_DAYS = 7
const URGENT_THRESHOLD_DAYS = 1

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
  const warningThreshold = new Date(now.getTime() + WARNING_THRESHOLD_DAYS * 24 * 60 * 60 * 1000)
  const urgentThreshold = new Date(now.getTime() + URGENT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000)

  logger.info({ route: 'cron/check-token-expiration' }, 'Token expiration check started')

  let expiredCount = 0
  let warningCount = 0
  let urgentCount = 0
  let errors = 0

  try {
    // 1. Tokens déjà expirés → marquer le compte 'expired' + notification
    const expiredAccounts = await db.linkedInAccount.findMany({
      where: {
        status: { in: ['active', 'disabled'] },
        tokenExpiresAt: { lt: now },
      },
      select: { id: true, userId: true, displayName: true, tokenExpiresAt: true, status: true },
    })

    for (const account of expiredAccounts) {
      try {
        // Marquer comme expiré si pas déjà fait
        if (account.status !== 'expired') {
          await db.linkedInAccount.update({
            where: { id: account.id },
            data: { status: 'expired' },
          })
        }

        // Vérifier qu'on n'a pas déjà notifié (1 notification par 24h)
        const existingNotif = await db.notification.findFirst({
          where: {
            userId: account.userId,
            type: 'linkedin',
            title: 'Token LinkedIn expiré',
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        })

        if (!existingNotif) {
          await db.notification.create({
            data: {
              userId: account.userId,
              type: 'linkedin',
              title: 'Token LinkedIn expiré',
              message: `Le token du compte ${account.displayName} a expiré. Reconnectez votre compte pour continuer à publier.`,
              link: '/connect/linkedin',
            },
          })
        }
        expiredCount++
      } catch (err) {
        errors++
        logger.error({ err: (err as Error).message, accountId: account.id }, 'Failed to process expired account')
      }
    }

    // 2. Tokens expirant dans les 7 jours (mais pas encore expirés ni urgents)
    const warningAccounts = await db.linkedInAccount.findMany({
      where: {
        status: 'active',
        tokenExpiresAt: {
          gte: urgentThreshold,
          lt: warningThreshold,
        },
      },
      select: { id: true, userId: true, displayName: true, tokenExpiresAt: true },
    })

    for (const account of warningAccounts) {
      try {
        // Vérifier qu'on n'a pas déjà notifié (1 notification par 48h)
        const existingNotif = await db.notification.findFirst({
          where: {
            userId: account.userId,
            type: 'linkedin',
            title: { contains: 'expire bientôt' },
            createdAt: { gte: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
          },
        })

        if (!existingNotif) {
          const daysLeft = Math.ceil((account.tokenExpiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          await db.notification.create({
            data: {
              userId: account.userId,
              type: 'linkedin',
              title: 'Token LinkedIn expire bientôt',
              message: `Le token du compte ${account.displayName} expire dans ${daysLeft} jour(s). Pensez à reconnecter votre compte.`,
              link: '/connect/linkedin',
            },
          })
        }
        warningCount++
      } catch (err) {
        errors++
        logger.error({ err: (err as Error).message, accountId: account.id }, 'Failed to process warning account')
      }
    }

    // 3. Tokens expirant dans les 24h (urgence)
    const urgentAccounts = await db.linkedInAccount.findMany({
      where: {
        status: 'active',
        tokenExpiresAt: {
          gte: now,
          lt: urgentThreshold,
        },
      },
      select: { id: true, userId: true, displayName: true, tokenExpiresAt: true },
    })

    for (const account of urgentAccounts) {
      try {
        const existingNotif = await db.notification.findFirst({
          where: {
            userId: account.userId,
            type: 'linkedin',
            title: 'Token LinkedIn expire aujourd\\hui',
            createdAt: { gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) },
          },
        })

        if (!existingNotif) {
          const hoursLeft = Math.ceil((account.tokenExpiresAt!.getTime() - now.getTime()) / (60 * 60 * 1000))
          await db.notification.create({
            data: {
              userId: account.userId,
              type: 'linkedin',
              title: 'Token LinkedIn expire aujourd\\hui',
              message: `URGENT: Le token du compte ${account.displayName} expire dans ${hoursLeft}h. Reconnectez immédiatement pour éviter une interruption.`,
              link: '/connect/linkedin',
            },
          })
        }
        urgentCount++
      } catch (err) {
        errors++
        logger.error({ err: (err as Error).message, accountId: account.id }, 'Failed to process urgent account')
      }
    }

    const durationMs = Date.now() - startTime
    logger.info({
      route: 'cron/check-token-expiration',
      expiredCount,
      warningCount,
      urgentCount,
      errors,
      durationMs,
    }, 'Token expiration check done')

    return NextResponse.json({
      success: true,
      data: {
        expired: expiredCount,
        warning: warningCount,
        urgent: urgentCount,
        errors,
        durationMs,
      },
    })
  } catch (error: any) {
    logger.error({
      err: error.message,
      route: 'cron/check-token-expiration',
    }, 'Token expiration check failed')
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
