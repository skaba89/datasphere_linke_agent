import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { processPendingComments, processCrmSequences } from '@/lib/automation'
import { verifyCronAuth, getCronSecret } from '@/lib/cron-secret'

// ============================================================
// GET /api/cron/automation
// Cron quotidien (via cron-job.org) qui :
//   1. Génère les réponses IA aux commentaires en attente
//   2. Traite les séquences CRM (génère les prochains messages)
//
// ⚠️ Protégé par CRON_SECRET (ou dérivé de JWT_SECRET)
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
  logger.info({ route: 'cron/automation' }, 'Cron automation started')

  // Récupérer tous les users actifs
  const users = await db.user.findMany({
    where: { linkedinAccounts: { some: { status: 'active' } } },
    select: { id: true },
  })

  let totalComments = 0
  let totalSequences = 0
  let errors = 0

  for (const user of users) {
    try {
      const [comments, sequences] = await Promise.all([
        processPendingComments(user.id),
        processCrmSequences(user.id),
      ])
      totalComments += comments.generated
      totalSequences += sequences.sent
    } catch (err: any) {
      logger.error({ err: err.message, userId: user.id }, 'Automation failed for user')
      errors++
    }
  }

  const durationMs = Date.now() - startTime
  logger.info({
    route: 'cron/automation',
    usersProcessed: users.length,
    commentsGenerated: totalComments,
    sequencesGenerated: totalSequences,
    errors,
    durationMs,
  }, 'Cron automation done')

  return NextResponse.json({
    success: true,
    data: {
      usersProcessed: users.length,
      commentsGenerated: totalComments,
      sequencesGenerated: totalSequences,
      errors,
      durationMs,
    },
  })
}
