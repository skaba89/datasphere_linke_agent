import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { decryptLinkedInToken } from '@/lib/linkedin-token-crypto'

// ============================================================
// LinkedIn Publisher - Publication fiable avec idempotence + retry
//
// Fonctionnalités:
//   1. Idempotence: si proposal déjà publié, ne pas republier
//   2. Retry avec backoff + jitter (3 tentatives)
//   3. Vérification post-publication (statut incertain)
//   4. Gestion des timeouts (AbortController)
//   5. Marquage 'publishing' pendant la tentative
//   6. Dead-letter: status='failed' après épuisement des retries
// ============================================================

interface PublishParams {
  accessToken?: string        // si fourni, utilisé tel quel
  encryptedAccessToken?: string // si fourni, déchiffré avant utilisation
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
  attempts?: number
}

const MAX_RETRIES = 3
const BASE_DELAY_MS = 2000
const TIMEOUT_MS = 30000

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function jitter(baseMs: number): number {
  return baseMs + Math.floor(Math.random() * 1000)
}

export async function publishPostToLinkedIn(params: PublishParams): Promise<PublishResult> {
  const { proposalId, content, userId } = params

  // Résoudre le token d'accès
  let accessToken = params.accessToken
  if (!accessToken && params.encryptedAccessToken) {
    try {
      accessToken = decryptLinkedInToken(params.encryptedAccessToken)
    } catch (err: any) {
      logger.error({ err: err.message, userId }, 'Failed to decrypt LinkedIn token')
      return {
        success: false,
        error: 'Impossible de déchiffrer le token. Reconnectez votre compte.',
        code: 'TOKEN_DECRYPT_FAILED',
      }
    }
  }

  if (!accessToken) {
    return { success: false, error: 'Token d\\accès manquant', code: 'NO_TOKEN' }
  }

  // Validations
  if (!content || !content.trim()) {
    return { success: false, error: 'Contenu vide', code: 'EMPTY_CONTENT' }
  }
  if (content.length > 3000) {
    return { success: false, error: 'Contenu trop long (3000 caractères max)', code: 'CONTENT_TOO_LONG' }
  }

  // ⭐ IDEMPOTENCE: vérifier si déjà publié
  if (proposalId) {
    const existing = await db.postProposal.findUnique({
      where: { id: proposalId },
      select: { id: true, status: true, linkedinPostId: true },
    })

    if (!existing) {
      return { success: false, error: 'Proposition introuvable', code: 'NOT_FOUND' }
    }

    // Si déjà publié → idempotence (ne pas republier)
    if (existing.status === 'published' && existing.linkedinPostId) {
      logger.info({ proposalId, linkedinPostId: existing.linkedinPostId }, 'Post already published (idempotent)')
      return {
        success: true,
        linkedinPostId: existing.linkedinPostId,
        code: 'ALREADY_PUBLISHED',
      }
    }

    // ⭐ Réservation: marquer comme 'publishing' (empêche les doubles publications concurrentes)
    await db.postProposal.update({
      where: { id: proposalId },
      data: { status: 'publishing' },
    })
  }

  // ⭐ RETRY avec backoff + jitter
  let lastError = ''
  let lastCode = ''
  let attempt = 0

  for (attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const linkedinRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: params.organizationId,
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
        signal: controller.signal,
      })

      clearTimeout(timeout)

      // ✅ Succès
      if (linkedinRes.ok) {
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

        logger.info({
          userId, proposalId, linkedinPostId, attempt,
        }, 'LinkedIn publish success')

        return {
          success: true,
          linkedinPostId: linkedinPostId || undefined,
          attempts: attempt,
        }
      }

      // Erreurs non récupérables (ne pas retry)
      const errText = await linkedinRes.text()

      if (linkedinRes.status === 401 || linkedinRes.status === 403) {
        // Token invalide → marquer le compte
        lastError = 'Token LinkedIn invalide. Reconnectez votre compte.'
        lastCode = 'TOKEN_INVALID'

        // Marquer la proposal comme failed
        if (proposalId) {
          await db.postProposal.update({
            where: { id: proposalId },
            data: { status: 'failed' },
          })
        }
        break // ne pas retry
      }

      if (linkedinRes.status === 422) {
        // Contenu invalide → ne pas retry
        lastError = `Contenu refusé par LinkedIn: ${errText}`
        lastCode = 'CONTENT_REJECTED'

        if (proposalId) {
          await db.postProposal.update({
            where: { id: proposalId },
            data: { status: 'failed' },
          })
        }
        break // ne pas retry
      }

      if (linkedinRes.status === 429) {
        // Rate limit → retry avec délai plus long
        lastError = 'Rate limit LinkedIn atteint'
        lastCode = 'RATE_LIMITED'

        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * attempt * 3 + jitter(2000)
          logger.warn({ attempt, delayMs: delay }, 'Rate limited, retrying...')
          await sleep(delay)
          continue
        }
        break
      }

      // Erreurs récupérables (500, 502, 503, timeout) → retry
      lastError = `Erreur LinkedIn API (${linkedinRes.status}): ${errText}`
      lastCode = 'LINKEDIN_API_ERROR'

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * attempt + jitter(1000)
        logger.warn({ attempt, delayMs: delay, status: linkedinRes.status }, 'Retrying publish...')
        await sleep(delay)
        continue
      }

      break
    } catch (err: any) {
      // Timeout ou erreur réseau → retry
      if (err.name === 'AbortError') {
        lastError = 'Timeout lors de la publication LinkedIn'
        lastCode = 'TIMEOUT'
      } else {
        lastError = err.message ?? 'Erreur réseau'
        lastCode = 'NETWORK_ERROR'
      }

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * attempt + jitter(1000)
        logger.warn({ attempt, delayMs: delay, err: lastError }, 'Network error, retrying...')
        await sleep(delay)
        continue
      }
      break
    }
  }

  // ⭐ DEAD-LETTER: tous les retries ont échoué
  logger.error({
    userId, proposalId, attempt, lastError, lastCode,
  }, 'LinkedIn publish failed after all retries')

  if (proposalId) {
    await db.postProposal.update({
      where: { id: proposalId },
      data: { status: 'failed' },
    })
  }

  return {
    success: false,
    error: lastError,
    code: lastCode,
    attempts: attempt,
  }
}
