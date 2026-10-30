import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { checkPlanLimit } from '@/lib/plans'
import { applyRateLimit, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit'

// ============================================================
// POST /api/linkedin/publish
// Publie un post sur LinkedIn via l'API v2 (UGC Posts).
//
// Body: { proposalId?: string } OU { content?: string, accountId?: string }
//
// Étapes :
//   1. Vérifier l'auth + le plan (limite postsPerDay)
//   2. Récupérer la proposal (si proposalId fourni)
//   3. Récupérer un compte LinkedIn actif + token non expiré
//   4. Appeler LinkedIn API v2 /ugcPosts
//   5. Mettre à jour la proposal (status=published, linkedinPostId)
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

    if (text.length > 3000) {
      return NextResponse.json(
        { success: false, error: 'Contenu trop long (3000 caractères max sur LinkedIn)' },
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

    // 4. ✅ VRAI appel à l'API LinkedIn v2 - UGC Posts
    const linkedinRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: account.organizationId,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }),
    })

    if (!linkedinRes.ok) {
      const errText = await linkedinRes.text()
      console.error('[LinkedIn API error]', linkedinRes.status, errText)

      // Token invalide ou révoqué
      if (linkedinRes.status === 401 || linkedinRes.status === 403) {
        await db.linkedInAccount.update({
          where: { id: account.id },
          data: { status: linkedinRes.status === 401 ? 'expired' : 'revoked' },
        })
        return NextResponse.json(
          {
            success: false,
            error: 'Token LinkedIn invalide ou révoqué. Reconnectez votre compte.',
            code: 'TOKEN_INVALID',
          },
          { status: 401 }
        )
      }

      // Rate limit LinkedIn
      if (linkedinRes.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: 'Trop de publications. LinkedIn limite le débit. Réessayez dans 1h.',
            code: 'RATE_LIMITED',
          },
          { status: 429 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: `Erreur LinkedIn API (${linkedinRes.status}): ${errText}`,
          code: 'LINKEDIN_API_ERROR',
        },
        { status: 502 }
      )
    }

    const linkedinData = await linkedinRes.json()
    const linkedinPostId = linkedinData.id || null

    // 5. Mettre à jour la proposal
    if (proposal) {
      await db.postProposal.update({
        where: { id: proposal.id },
        data: {
          status: 'published',
          linkedinPostId,
          publishedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: { linkedinPostId, publishedAt: new Date().toISOString() },
    })
  } catch (error: any) {
    console.error('[POST /api/linkedin/publish]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
