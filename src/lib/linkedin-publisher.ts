import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// ============================================================
// LinkedIn Publisher - logique partagée de publication
//
// Utilisé par :
//   - POST /api/linkedin/publish (manuel, par l'user)
//   - GET /api/cron/scheduled-publish (auto, par le cron)
// ============================================================

interface PublishParams {
  accessToken: string
  organizationId: string
  proposalId?: string
  content: string
  userId: string
}

interface PublishResult {
  success: boolean
  linkedinPostId?: string
  error?: string
  code?: string
}

export async function publishPostToLinkedIn(params: PublishParams): Promise<PublishResult> {
  const { accessToken, organizationId, proposalId, content, userId } = params

  if (!content || !content.trim()) {
    return { success: false, error: 'Contenu vide', code: 'EMPTY_CONTENT' }
  }

  if (content.length > 3000) {
    return { success: false, error: 'Contenu trop long (3000 caractères max)', code: 'CONTENT_TOO_LONG' }
  }

  try {
    // Appel à l'API LinkedIn v2 - UGC Posts
    const linkedinRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: organizationId,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
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
      logger.error({
        status: linkedinRes.status,
        errText,
        userId,
        proposalId,
      }, 'LinkedIn API error during publish')

      // Token invalide
      if (linkedinRes.status === 401) {
        return {
          success: false,
          error: 'Token LinkedIn invalide. Reconnectez votre compte.',
          code: 'TOKEN_INVALID',
        }
      }

      // Rate limit LinkedIn
      if (linkedinRes.status === 429) {
        return {
          success: false,
          error: 'Trop de publications. Réessayez plus tard.',
          code: 'RATE_LIMITED',
        }
      }

      return {
        success: false,
        error: `Erreur LinkedIn API (${linkedinRes.status}): ${errText}`,
        code: 'LINKEDIN_API_ERROR',
      }
    }

    const linkedinData = await linkedinRes.json()
    const linkedinPostId = linkedinData.id || null

    // Mettre à jour la proposal
    if (proposalId) {
      await db.postProposal.update({
        where: { id: proposalId },
        data: {
          status: 'published',
          linkedinPostId,
          publishedAt: new Date(),
        },
      })
    }

    return { success: true, linkedinPostId: linkedinPostId || undefined }
  } catch (err: any) {
    logger.error({ err: err.message, userId, proposalId }, 'Exception during publish')
    return {
      success: false,
      error: err.message ?? 'Erreur serveur',
      code: 'SERVER_ERROR',
    }
  }
}
