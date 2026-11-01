import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyCronAuth } from '@/lib/cron-secret'
import { logger } from '@/lib/logger'

// ============================================================
// POST /api/email-bridge/inbound
// Email-to-LinkedIn Bridge
//
// Reçoit un email entrant (de Resend Inbound, ou tout autre
// provider supportant un format similaire) et crée un brouillon
// de PostProposal pour l'utilisateur correspondant.
//
// Format attendu (compatible Resend Inbound webhook):
// {
//   "from": "user@example.com",
//   "to": "post@bridge.datasphere.app",
//   "subject": "Mon post LinkedIn",
//   "text": "contenu textuel",
//   "html": "<p>contenu HTML</p>"
// }
//
// Sécurité :
//   - Authentification via Bearer CRON_SECRET (dérivé de JWT_SECRET)
//   - L'email "from" doit correspondre à un utilisateur enregistré
//   - Le corps du post est extrait de "text" (fallback "html" strippé)
//   - Plan gate : Pro+ uniquement
// ============================================================

const MAX_POST_LENGTH = 5000

// Strip HTML tags to extract plain text
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// Extract hashtags from content (#word)
function extractHashtags(text: string): string {
  const matches = text.match(/#[\wàâäéèêëïîôöùûüç-]+/gi) || []
  return matches.join(' ')
}

// Detect post format based on content
function detectFormat(content: string): string {
  if (content.match(/^\d+\.\s/m)) return 'list'
  if (content.includes('?')) return 'question'
  if (content.length > 1000) return 'long-form'
  return 'short'
}

export async function POST(request: Request) {
  const startTime = Date.now()

  // ─── Auth ───
  const authHeader = request.headers.get('authorization')
  if (!verifyCronAuth(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Resend Inbound format compatibility
    const fromEmail = (body.from || body.sender || body.envelope?.from || '').toLowerCase().trim()
    const subject = (body.subject || '(Sans sujet)').trim()
    const textContent = (body.text || '').trim()
    const htmlContent = body.html || ''
    const toEmail = (body.to || body.recipient || '').toLowerCase().trim()

    if (!fromEmail) {
      return NextResponse.json({ success: false, error: 'Expéditeur manquant' }, { status: 400 })
    }

    // Extract pure email from "Name <email@example.com>" format
    const emailMatch = fromEmail.match(/<([^>]+)>/) || [, fromEmail]
    const cleanEmail = (emailMatch[1] || fromEmail).trim()

    // ─── Find user by email ───
    const user = await db.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, email: true, plan: true, role: true, name: true },
    })

    if (!user) {
      logger.info({ cleanEmail }, 'Email bridge: unknown user')
      return NextResponse.json({
        success: false,
        error: 'Utilisateur introuvable. Créez un compte avec cet email.',
      }, { status: 404 })
    }

    // ─── Plan gate ───
    const plan = (user.plan || 'free').toLowerCase()
    const isAdmin = user.role === 'admin'
    if (!isAdmin && plan !== 'pro' && plan !== 'business' && plan !== 'agency') {
      return NextResponse.json({
        success: false,
        error: 'Email-to-LinkedIn Bridge est réservé aux plans Pro et supérieurs.',
      }, { status: 403 })
    }

    // ─── Build post content ───
    let content = textContent
    if (!content && htmlContent) {
      content = stripHtml(htmlContent)
    }
    if (!content) {
      return NextResponse.json({
        success: false,
        error: 'Email vide ou contenu introuvable',
      }, { status: 400 })
    }
    if (content.length > MAX_POST_LENGTH) {
      content = content.slice(0, MAX_POST_LENGTH)
    }

    // Strip common email signatures and quoted replies
    content = content
      .split(/\n--\s*\n/)[0] // signature separator
      .split(/^On .* wrote:/m)[0]
      .split(/^Le .* a écrit :/m)[0]
      .trim()

    const hashtags = extractHashtags(content)
    const format = detectFormat(content)
    const title = subject.replace(/^(re|fwd|tr):\s*/i, '').trim().slice(0, 80) || 'Post par email'

    // ─── Create PostProposal (status=pending, never auto-publish) ───
    const proposal = await db.postProposal.create({
      data: {
        userId: user.id,
        title,
        content,
        hashtags,
        format,
        angle: 'email-bridge',
        targetAudience: 'Email bridge',
        qualityScore: 5.0, // default, can be improved later by Content Quality Studio
        optimalTime: 'manual',
        engagementEst: 'pending',
        status: 'pending', // anti-bypass: always pending, user must approve
      },
    })

    // ─── Notification ───
    await db.notification.create({
      data: {
        userId: user.id,
        type: 'ai',
        title: 'Nouveau post depuis email',
        message: `"${title}" reçu depuis ${cleanEmail}. Vérifiez et approuvez avant publication.`,
        link: '/?tab=proposals',
      },
    })

    const durationMs = Date.now() - startTime
    logger.info({
      route: 'email-bridge/inbound',
      userId: user.id,
      proposalId: proposal.id,
      contentLength: content.length,
      durationMs,
    }, 'Email bridge: draft created')

    return NextResponse.json({
      success: true,
      data: {
        proposalId: proposal.id,
        title,
        contentPreview: content.slice(0, 200),
        contentLength: content.length,
        hashtags,
        format,
        status: 'pending',
      },
    })
  } catch (error: any) {
    logger.error({ err: error.message, route: 'email-bridge/inbound' }, 'Email bridge error')
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// ============================================================
// GET /api/email-bridge/inbound
// Documentation endpoint (returns setup instructions)
// ============================================================
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      endpoint: '/api/email-bridge/inbound',
      method: 'POST',
      auth: 'Bearer <CRON_SECRET> (dérivé de JWT_SECRET)',
      format: {
        from: 'user@example.com (doit correspondre à un compte DataSphere)',
        to: 'post@bridge.datasphere.app',
        subject: 'Sujet du post (sera utilisé comme titre)',
        text: 'Contenu textuel du post',
        html: 'Contenu HTML (fallback si text vide)',
      },
      planGate: 'Pro+',
      notes: [
        'Le post est créé avec status=pending (jamais auto-publié)',
        'Une notification est envoyée à l\'utilisateur',
        'Les hashtags sont extraits automatiquement du contenu',
        'Longueur max: 5000 caractères',
        'Signatures et citations sont automatiquement supprimées',
      ],
    },
  })
}
