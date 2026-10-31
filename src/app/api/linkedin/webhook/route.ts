import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// ============================================================
// POST /api/linkedin/webhook
// Reçoit les webhooks LinkedIn (engagement sur les posts)
//
// ⚠️ LinkedIn ne propose pas d'webhooks "person" par défaut
// (réservé aux pages entreprises avec LinkedIn Pages API)
// Cette route est préparée pour quand on aura l'organisation API
//
// LinkedIn envoie un webhook avec :
//   { value: { action: '...', object: 'urn:li:...', ... } }
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Vérification du secret partagé (header X-LinkedIn-Webhook-Secret)
    const secret = request.headers.get('x-linkedin-webhook-secret')
    const expectedSecret = process.env.LINKEDIN_WEBHOOK_SECRET

    if (expectedSecret && secret !== expectedSecret) {
      logger.warn({ route: 'linkedin/webhook' }, 'Unauthorized webhook')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info({ route: 'linkedin/webhook', body }, 'LinkedIn webhook received')

    // Parser le webhook selon le format LinkedIn
    // Format typique : { value: { action, object, actor, ... } }
    const value = body.value || body
    const action = value.action || body.action
    const objectUrn = value.object || body.object
    const actorUrn = value.actor || body.actor

    if (!objectUrn) {
      return NextResponse.json({ success: true, message: 'No object URN' })
    }

    // Trouver le post correspondant dans notre DB
    const proposal = await db.postProposal.findFirst({
      where: { linkedinPostId: objectUrn },
      include: { user: { include: { linkedinAccounts: { where: { status: 'active' } } } } },
    })

    if (!proposal) {
      logger.info({ objectUrn }, 'Webhook for unknown post, ignoring')
      return NextResponse.json({ success: true, message: 'Post not found' })
    }

    // Mettre à jour les metrics en temps réel selon l'action
    const today = new Date().toISOString().split('T')[0]

    switch (action) {
      case 'LIKE':
      case 'COMMENT':
      case 'SHARE': {
        // Upsert metric for today
        const existing = await db.engagementMetric.findFirst({
          where: { userId: proposal.userId, date: today },
        })

        if (existing) {
          const updates: any = {}
          if (action === 'LIKE') updates.likes = { increment: 1 }
          if (action === 'COMMENT') updates.comments = { increment: 1 }
          if (action === 'SHARE') updates.shares = { increment: 1 }

          await db.engagementMetric.update({
            where: { id: existing.id },
            data: updates,
          })
        } else {
          await db.engagementMetric.create({
            data: {
              userId: proposal.userId,
              date: today,
              likes: action === 'LIKE' ? 1 : 0,
              comments: action === 'COMMENT' ? 1 : 0,
              shares: action === 'SHARE' ? 1 : 0,
              views: 0,
              clicks: 0,
            },
          })
        }
        break
      }

      case 'VIEW': {
        // Les vues sont généralement agrégées, pas en temps réel
        // On les laisse au cron de sync
        break
      }

      default:
        logger.info({ action }, 'Unknown webhook action')
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error({ err: error.message, route: 'linkedin/webhook' }, 'Webhook error')
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

// ============================================================
// GET /api/linkedin/webhook
// Verification endpoint (LinkedIn webhook subscription verification)
// ============================================================
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('hub.challenge')
  const mode = searchParams.get('hub.mode')

  if (mode === 'subscribe' && challenge) {
    // Vérifier le token (configuré dans LinkedIn Developer)
    const verifyToken = searchParams.get('hub.verify_token')
    const expectedToken = process.env.LINKEDIN_WEBHOOK_VERIFY_TOKEN

    if (expectedToken && verifyToken !== expectedToken) {
      return NextResponse.json({ error: 'Invalid verify token' }, { status: 403 })
    }

    // LinkedIn attend le challenge en plain text
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
