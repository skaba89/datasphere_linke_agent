import { NextResponse } from 'next/server'
import { decryptLinkedInToken } from '@/lib/linkedin-token-crypto'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { checkPlanLimit } from '@/lib/plans'
import { applyRateLimit, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit'
import { publishPostToLinkedIn } from '@/lib/linkedin-publisher'

// ============================================================
// POST /api/linkedin/publish
// Publie un post sur LinkedIn via l'API v2 (UGC Posts).
//
// Body: { proposalId?: string } OU { content?: string, accountId?: string }
// ============================================================
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérifier la limite postsPerDay
    const limitCheck = await checkPlanLimit(userId, 'postsPerDay')
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Limite de votre plan atteinte (${limitCheck.limit} posts/jour). Passez à l'offre supérieure.`,
          upgrade: true,
          remaining: limitCheck.remaining,
        },
        { status: 402 }
      )
    }

    // Rate limiting : 20 publications / heure / user
    const rl = applyRateLimit(request, 'li-publish', RATE_LIMITS.linkedinPublish, userId)
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Trop de publications. Réessayez plus tard.' },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders(rl),
            'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    const body = await request.json()
    const { proposalId, accountId, content: rawContent } = body

    // 1. Récupérer la proposal (si fournie)
    let proposal: any = null
    let text = rawContent as string | undefined

    if (proposalId) {
      proposal = await db.postProposal.findFirst({
        where: { id: proposalId, userId },
      })
      if (!proposal) {
        return NextResponse.json(
          { success: false, error: 'Proposition introuvable' },
          { status: 404 }
        )
      }
      text = proposal.content + (proposal.hashtags ? `\n\n${proposal.hashtags}` : '')
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Contenu vide' },
        { status: 400 }
      )
    }

    // 2. Récupérer un compte LinkedIn actif
    let account: any = null
    if (accountId) {
      account = await db.linkedInAccount.findFirst({
        where: { id: accountId, userId, status: 'active' },
      })
    } else {
      account = await db.linkedInAccount.findFirst({
        where: { userId, status: 'active' },
        orderBy: { updatedAt: 'desc' },
      })
    }

    if (!account) {
      return NextResponse.json(
        {
          success: false,
          error: 'Aucun compte LinkedIn actif. Connectez votre compte LinkedIn d\'abord.',
          code: 'NO_LINKEDIN_ACCOUNT',
        },
        { status: 400 }
      )
    }

    // 3. Vérifier l'expiration du token
    if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) < new Date()) {
      await db.linkedInAccount.update({
        where: { id: account.id },
        data: { status: 'expired' },
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Token LinkedIn expiré. Reconnectez votre compte.',
          code: 'TOKEN_EXPIRED',
        },
        { status: 401 }
      )
    }

    // 4. ✅ Publication via shared module
    const result = await publishPostToLinkedIn({
      accessToken: decryptLinkedInToken(account.accessToken),
      organizationId: account.organizationId,
      proposalId: proposal?.id,
      content: text,
      userId,
    })

    if (!result.success) {
      // Si token invalide, marquer le compte
      if (result.code === 'TOKEN_INVALID') {
        await db.linkedInAccount.update({
          where: { id: account.id },
          data: { status: 'revoked' },
        })
      }

      const status = result.code === 'TOKEN_INVALID' ? 401
        : result.code === 'RATE_LIMITED' ? 429
        : result.code === 'LINKEDIN_API_ERROR' ? 502
        : 500

      return NextResponse.json(
        { success: false, error: result.error, code: result.code },
        { status }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        linkedinPostId: result.linkedinPostId,
        publishedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('[POST /api/linkedin/publish]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
