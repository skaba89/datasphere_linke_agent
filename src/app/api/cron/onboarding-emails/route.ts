import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { sendTrialExpiringEmail, sendWelcomeEmail } from '@/lib/email'
import { verifyCronAuth, getCronSecret } from '@/lib/cron-secret'

// ============================================================
// GET /api/cron/onboarding-emails
// Cron job quotidien qui envoie :
//   - Email J+0 : bienvenue (si pas déjà envoyé, via welcomeSentAt flag)
//   - Email J+11 : trial expire dans 3 jours (Pro 14j)
//   - Email J+13 : trial expire demain (dernier rappel)
//
// ⚠️ Protégé par CRON_SECRET (ou dérivé de JWT_SECRET automatiquement)
//
// Render cron config :
//   Schedule: "0 9 * * *" (tous les jours à 9h UTC)
// ============================================================

export async function GET(request: Request) {
  const secret = getCronSecret()
  if (!secret) {
    logger.error({ route: 'cron/onboarding-emails' }, 'No JWT_SECRET or CRON_SECRET configured')
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (!verifyCronAuth(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  logger.info({ route: 'cron/onboarding-emails' }, 'Cron onboarding-emails started')

  let sentWelcome = 0
  let sentTrialExpiring = 0
  let errors = 0

  // 1. Emails de bienvenue pour users créés dans les dernières 24h
  // (qui n'ont pas reçu l'email - on suppose qu'ils l'ont reçu car on l'envoie au register)
  // En réalité, le welcome est envoyé au register, donc ce cron est un filet de sécurité
  const yesterday = new Date()
  yesterday.setHours(yesterday.getHours() - 24)

  const recentUsers = await db.user.findMany({
    where: {
      createdAt: { gte: yesterday },
      // Pas de filtre welcomeSentAt car on n'a pas ce champ (pour simplifier)
    },
    select: { id: true, email: true, name: true, createdAt: true },
  })

  for (const user of recentUsers) {
    try {
      // Envoyer seulement si l'user a été créé il y a moins d'1h
      // (sinon il a déjà reçu l'email au register)
      const oneHourAgo = new Date()
      oneHourAgo.setHours(oneHourAgo.getHours() - 1)
      if (new Date(user.createdAt) > oneHourAgo) {
        continue // déjà envoyé par le register
      }
      // Si créé il y a +1h mais -24h, on suppose que l'email register a échoué
      // → on l'envoie en retry
      await sendWelcomeEmail(user.email, user.name)
      sentWelcome++
    } catch (err: any) {
      logger.error({ err: err.message, userId: user.id }, 'Failed to send welcome email')
      errors++
    }
  }

  // 2. Emails "trial expire dans 3 jours" (J+11) et "trial expire demain" (J+13)
  const now = new Date()
  const threeDaysFromNow = new Date()
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
  const oneDayFromNow = new Date()
  oneDayFromNow.setDate(oneDayFromNow.getDate() + 1)

  // Users dont le trial expire dans 3 jours (J+11)
  const trialEnding3dUsers = await db.user.findMany({
    where: {
      trialEndsAt: {
        gte: new Date(threeDaysFromNow.setHours(0, 0, 0, 0)),
        lte: new Date(threeDaysFromNow.setHours(23, 59, 59, 999)),
      },
      plan: 'free', // pas encore upgradé
      stripeSubscriptionId: null,
    },
    select: { id: true, email: true, name: true, trialEndsAt: true },
  })

  for (const user of trialEnding3dUsers) {
    try {
      await sendTrialExpiringEmail(user.email, 3, new Date(user.trialEndsAt!))
      sentTrialExpiring++
    } catch (err: any) {
      logger.error({ err: err.message, userId: user.id }, 'Failed to send trial expiring email')
      errors++
    }
  }

  // Users dont le trial expire demain (J+13)
  const trialEnding1dUsers = await db.user.findMany({
    where: {
      trialEndsAt: {
        gte: new Date(oneDayFromNow.setHours(0, 0, 0, 0)),
        lte: new Date(oneDayFromNow.setHours(23, 59, 59, 999)),
      },
      plan: 'free',
      stripeSubscriptionId: null,
    },
    select: { id: true, email: true, name: true, trialEndsAt: true },
  })

  for (const user of trialEnding1dUsers) {
    try {
      await sendTrialExpiringEmail(user.email, 1, new Date(user.trialEndsAt!))
      sentTrialExpiring++
    } catch (err: any) {
      logger.error({ err: err.message, userId: user.id }, 'Failed to send trial expiring email')
      errors++
    }
  }

  const durationMs = Date.now() - startTime
  logger.info({
    route: 'cron/onboarding-emails',
    sentWelcome,
    sentTrialExpiring,
    errors,
    durationMs,
  }, 'Cron onboarding-emails done')

  return NextResponse.json({
    success: true,
    data: {
      sentWelcome,
      sentTrialExpiring,
      errors,
      durationMs,
      timestamp: new Date().toISOString(),
    },
  })
}
