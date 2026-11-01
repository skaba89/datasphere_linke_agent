import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { publishPostToLinkedIn } from '@/lib/linkedin-publisher'
import { verifyCronAuth, getCronSecret } from '@/lib/cron-secret'

// ============================================================
// GET /api/cron/scheduled-publish
// Cron job Render (toutes les 30 min) qui :
//   1. Pour chaque user avec SmartPosterSettings.enabled=true
//   2. Vérifie l'heure actuelle dans la timezone du user
//   3. Si dans la fenêtre de publication (scheduleHourStart - scheduleHourEnd)
//   4. Et que le user n'a pas déjà dépassé maxPostsPerDay aujourd'hui
//   5. Et qu'il existe des proposals 'approved' non publiées
//   6. Publie la meilleure proposal (highest qualityScore) sur LinkedIn
//
// ⚠️ Protégé par CRON_SECRET (ou dérivé de JWT_SECRET automatiquement)
//
// Render cron config :
//   Schedule: "0,30 * * * *" (toutes les 30 min)
//   Headers: Authorization: Bearer ${CRON_SECRET}
// ============================================================

export async function GET(request: Request) {
  const secret = getCronSecret()
  if (!secret) {
    logger.error({ route: 'cron/scheduled-publish' }, 'No JWT_SECRET or CRON_SECRET configured')
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (!verifyCronAuth(authHeader)) {
    logger.warn({ route: 'cron/scheduled-publish' }, 'Unauthorized cron access')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  logger.info({ route: 'cron/scheduled-publish' }, 'Cron scheduled-publish started')

  // Récupérer tous les users avec SmartPoster enabled
  const enabledSettings = await db.smartPosterSettings.findMany({
    where: { enabled: true },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          plan: true,
          trialEndsAt: true,
          linkedinAccounts: { where: { status: 'active' }, take: 1 },
        },
      },
    },
  })

  let totalPublished = 0
  let totalSkipped = 0
  let totalErrors = 0

  for (const settings of enabledSettings) {
    try {
      const result = await tryPublishForUser(settings)
      if (result.published) {
        totalPublished++
      } else {
        totalSkipped++
      }
    } catch (err: any) {
      logger.error({ err: err.message, userId: settings.userId }, 'Error in scheduled publish')
      totalErrors++
    }
  }

  const durationMs = Date.now() - startTime
  logger.info({
    route: 'cron/scheduled-publish',
    usersChecked: enabledSettings.length,
    totalPublished,
    totalSkipped,
    totalErrors,
    durationMs,
  }, 'Cron scheduled-publish done')

  return NextResponse.json({
    success: true,
    data: {
      usersChecked: enabledSettings.length,
      totalPublished,
      totalSkipped,
      totalErrors,
      durationMs,
      timestamp: new Date().toISOString(),
    },
  })
}

// ============================================================
// Logique de publication pour un user
// ============================================================
async function tryPublishForUser(settings: any): Promise<{ published: boolean; reason?: string }> {
  const { user } = settings

  // 1. Vérifier qu'il a un compte LinkedIn actif
  if (!user.linkedinAccounts || user.linkedinAccounts.length === 0) {
    return { published: false, reason: 'no_linkedin_account' }
  }

  const now = new Date()

  // ⭐ PRIORITY 1: Publier les posts avec scheduledFor <= now (per-post scheduling)
  // Ces posts sont publiés quel que soit le Smart Poster window
  const scheduledProposal = await db.postProposal.findFirst({
    where: {
      userId: user.id,
      status: 'approved',
      scheduledFor: { lte: now },
      publishedAt: null,
    },
    orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
  })

  if (scheduledProposal) {
    const account = user.linkedinAccounts[0]
    const result = await publishPostToLinkedIn({
      encryptedAccessToken: account.accessToken,
      organizationId: account.organizationId,
      proposalId: scheduledProposal.id,
      content: scheduledProposal.content + (scheduledProposal.hashtags ? `\n\n${scheduledProposal.hashtags}` : ''),
      userId: user.id,
    })

    if (!result.success) {
      logger.warn({
        userId: user.id,
        proposalId: scheduledProposal.id,
        error: result.error,
      }, 'Scheduled (per-post) publish failed')
      return { published: false, reason: 'publish_failed' }
    }

    logger.info({
      userId: user.id,
      proposalId: scheduledProposal.id,
      linkedinPostId: result.linkedinPostId,
      scheduledFor: scheduledProposal.scheduledFor,
    }, 'Per-post scheduled publish success')

    return { published: true }
  }

  // ⭐ PRIORITY 2: Smart Poster auto-publish (si activé)
  if (!settings.autoApprove && !settings.enabled) {
    return { published: false, reason: 'smart_poster_disabled' }
  }

  // 2. Vérifier la timezone et l'heure actuelle
  const userTime = new Date(now.toLocaleString('en-US', { timeZone: settings.timezone || 'Europe/Paris' }))
  const currentHour = userTime.getHours()

  if (currentHour < settings.scheduleHourStart || currentHour >= settings.scheduleHourEnd) {
    return { published: false, reason: 'outside_schedule_window' }
  }

  // 3. Vérifier le nombre de posts déjà publiés aujourd'hui
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const postsToday = await db.postProposal.count({
    where: {
      userId: user.id,
      publishedAt: { gte: todayStart, lte: todayEnd },
    },
  })

  // Limite selon le plan (en trial = Pro)
  const trialActive = user.trialEndsAt ? new Date(user.trialEndsAt) > new Date() : false
  const effectivePlan = trialActive ? 'pro' : user.plan
  const limits: Record<string, number> = { free: 3, pro: 20, business: 100 }
  const maxPosts = limits[effectivePlan] || 3

  if (postsToday >= Math.min(settings.maxPostsPerDay, maxPosts)) {
    return { published: false, reason: 'max_posts_reached' }
  }

  // 4. Récupérer la meilleure proposal approuvée non publiée (sans scheduledFor)
  const proposal = await db.postProposal.findFirst({
    where: {
      userId: user.id,
      status: 'approved',
      publishedAt: null,
      scheduledFor: null, // Exclure les posts planifiés (gérés par la priority 1)
    },
    orderBy: [{ qualityScore: 'desc' }, { createdAt: 'asc' }],
  })

  if (!proposal) {
    return { published: false, reason: 'no_approved_proposals' }
  }

  // 5. Publier sur LinkedIn (passe le token chiffré, le publisher déchiffre)
  const account = user.linkedinAccounts[0]
  const result = await publishPostToLinkedIn({
    encryptedAccessToken: account.accessToken,
    organizationId: account.organizationId,
    proposalId: proposal.id,
    content: proposal.content + (proposal.hashtags ? `\n\n${proposal.hashtags}` : ''),
    userId: user.id,
  })

  if (!result.success) {
    logger.warn({
      userId: user.id,
      proposalId: proposal.id,
      error: result.error,
    }, 'Scheduled publish failed for proposal')
    return { published: false, reason: 'publish_failed' }
  }

  logger.info({
    userId: user.id,
    proposalId: proposal.id,
    linkedinPostId: result.linkedinPostId,
  }, 'Smart Poster auto-publish success')

  return { published: true }
}
