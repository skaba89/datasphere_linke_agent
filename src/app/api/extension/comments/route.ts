import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyApiKey } from '@/lib/api-keys'
import { logger } from '@/lib/logger'

// ============================================================
// POST /api/extension/comments
// Reçoit les commentaires capturés par la Chrome Extension
//
// Auth: Bearer <API_KEY> (dsk_live_XXX, plan Business+)
// Body: {
//   comments: [
//     {
//       commenterName: string,
//       commenterText: string,
//       postUrl: string,        // URL LinkedIn du post
//       postUrn?: string,       // URN LinkedIn si disponible
//       commentUrl?: string,    // URL directe du commentaire
//       timestamp?: string,     // ISO date
//     }
//   ]
// }
//
// Crée des CommentReply avec status=pending pour traitement par l'IA.
// ============================================================

export async function POST(request: Request) {
  try {
    // ─── Auth ───
    const authHeader = request.headers.get('authorization')
    const authResult = await verifyApiKey(authHeader)
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé. Fournissez un header Authorization: Bearer <api_key>' },
        { status: 401 }
      )
    }
    const { userId } = authResult

    const body = await request.json()
    const { comments } = body

    if (!Array.isArray(comments) || comments.length === 0) {
      return NextResponse.json({ success: false, error: 'Liste de commentaires vide ou invalide' }, { status: 400 })
    }
    if (comments.length > 100) {
      return NextResponse.json({ success: false, error: 'Maximum 100 commentaires par requête' }, { status: 400 })
    }

    let created = 0
    let duplicates = 0
    const errors: string[] = []

    for (const c of comments) {
      try {
        if (!c.commenterName || !c.commenterText) {
          errors.push(`Commentaire invalide: commenterName et commenterText requis`)
          continue
        }

        // Essayer de matcher un PostProposal existant via postUrn ou postUrl
        let postProposalId: string | null = null
        const linkedinPostId: string | null = c.postUrn || null

        if (c.postUrn) {
          const post = await db.postProposal.findFirst({
            where: { userId, linkedinPostId: c.postUrn },
            select: { id: true },
          })
          if (post) postProposalId = post.id
        }

        // Vérifier doublon: même commenter + même texte pour le même user (24h)
        const existing = await db.commentReply.findFirst({
          where: {
            userId,
            commenterName: c.commenterName,
            commenterText: { startsWith: c.commenterText.slice(0, 100) },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
          select: { id: true },
        })
        if (existing) {
          duplicates++
          continue
        }

        await db.commentReply.create({
          data: {
            userId,
            postProposalId,
            linkedinPostId,
            commenterName: String(c.commenterName).slice(0, 200),
            commenterText: String(c.commenterText).slice(0, 5000),
            generatedReply: '', // sera généré par l'IA via le cron automation
            status: 'pending',
          },
        })
        created++
      } catch (err: any) {
        errors.push(`Erreur sur un commentaire: ${err.message}`)
      }
    }

    logger.info({
      route: 'extension/comments',
      userId,
      received: comments.length,
      created,
      duplicates,
      errors: errors.length,
    }, 'Extension comments processed')

    return NextResponse.json({
      success: true,
      data: {
        received: comments.length,
        created,
        duplicates,
        errors: errors.slice(0, 10),
      },
    })
  } catch (error: any) {
    console.error('[POST /api/extension/comments]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// ============================================================
// GET /api/extension/comments
// Returns documentation for the Chrome Extension
// ============================================================
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      endpoint: '/api/extension/comments',
      method: 'POST',
      auth: 'Bearer dsk_live_XXX (plan Business+ requis)',
      maxBatchSize: 100,
      body: {
        comments: [
          {
            commenterName: 'Nom de la personne qui a commenté',
            commenterText: 'Texte du commentaire',
            postUrl: 'URL LinkedIn du post',
            postUrn: 'URN LinkedIn du post (optionnel)',
            commentUrl: 'URL directe du commentaire (optionnel)',
            timestamp: 'ISO date (optionnel)',
          },
        ],
      },
      notes: [
        'Déduplication automatique: même commenter + même texte sur 24h',
        'Les commentaires sont créés avec status=pending',
        'L\'IA générera les réponses via le cron automation',
      ],
    },
  })
}
