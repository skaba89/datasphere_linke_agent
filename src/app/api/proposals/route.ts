import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import {
  decodeCursor,
  normalizeLimit,
  buildPaginationResult,
} from '@/lib/pagination'

// ============================================================
// GET /api/proposals
// Liste les propositions de l'utilisateur courant
//
// Query params (cursor-based pagination):
//   - limit : nombre d'items par page (défaut 20, max 100)
//   - cursor : curseur de la page précédente
//   - status : filtrer par statut (pending, approved, published, rejected, failed)
//
// Réponse:
//   { success, data, nextCursor, hasMore }
// ============================================================
export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(request.url)

    const limit = normalizeLimit(parseInt(searchParams.get('limit') || '20'))
    const cursor = searchParams.get('cursor') || undefined
    const status = searchParams.get('status') || undefined

    // Decode cursor to get the last item's id
    // If a cursor is provided but doesn't decode properly, return 400
    const cursorId = cursor ? decodeCursor(cursor) : null
    if (cursor && !cursorId) {
      return NextResponse.json(
        { success: false, error: 'Curseur invalide (format incorrect)' },
        { status: 400 }
      )
    }

    // If we have a valid cursor, fetch the cursor item to get its createdAt
    let cursorItem: { id: string; createdAt: Date } | null = null
    if (cursorId) {
      cursorItem = await db.postProposal.findUnique({
        where: { id: cursorId },
        select: { id: true, createdAt: true },
      })
      if (!cursorItem) {
        return NextResponse.json(
          { success: false, error: 'Curseur invalide ou expiré' },
          { status: 400 }
        )
      }
    }

    const where: any = {}
    if (userId) where.userId = userId
    if (status) where.status = status

    // Cursor-based where clause: items older than the cursor item
    if (cursorItem) {
      where.OR = [
        { createdAt: { lt: cursorItem.createdAt } },
        { createdAt: cursorItem.createdAt, id: { lt: cursorItem.id } },
      ]
    }

    // Fetch limit + 1 to detect hasMore
    const proposals = await db.postProposal.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })

    const result = buildPaginationResult(proposals, limit)

    return NextResponse.json({
      success: true,
      data: result.data,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    })
  } catch (error) {
    console.error('Error fetching proposals:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch proposals' },
      { status: 500 },
    )
  }
}

// ============================================================
// POST /api/proposals
// Crée une nouvelle proposition de post (générée par IA ou manuelle)
// ⚠️ Le status est forcé à 'pending' (anti-bypass : un client ne peut
//    pas créer une proposal déjà 'published' en contournant la validation)
// ============================================================
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await request.json()

    const required = ['title', 'content']
    for (const f of required) {
      if (!body[f]) {
        return NextResponse.json(
          { success: false, error: `Champ requis: ${f}` },
          { status: 400 }
        )
      }
    }

    const proposal = await db.postProposal.create({
      data: {
        userId: userId || null,
        title: body.title,
        content: body.content,
        hashtags: body.hashtags || '',
        format: body.format || 'text',
        angle: body.angle || '',
        targetAudience: body.targetAudience || '',
        qualityScore: typeof body.qualityScore === 'number' ? body.qualityScore : 0,
        optimalTime: body.optimalTime || '',
        engagementEst: body.engagementEst || '',
        status: 'pending', // ✅ Toujours 'pending' à la création
      },
    })

    return NextResponse.json({ success: true, data: proposal }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/proposals]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// PATCH /api/proposals
// Met à jour le statut d'une proposition (approve/reject/publish)
// Body: { id, status?, scheduledFor? }
//   - status: 'pending' | 'approved' | 'rejected' | 'published' | 'failed'
//   - scheduledFor: ISO date string (nullable to unschedule)
// ============================================================
export async function PATCH(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, status, scheduledFor } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Champ requis: id' },
        { status: 400 }
      )
    }

    if (!status && scheduledFor === undefined) {
      return NextResponse.json(
        { success: false, error: 'Au moins un champ à mettre à jour: status ou scheduledFor' },
        { status: 400 }
      )
    }

    const ALLOWED_STATUSES = ['pending', 'approved', 'rejected', 'published', 'failed']
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Status invalide. Autorisés: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Vérifier l'appartenance
    const existing = await db.postProposal.findFirst({
      where: { id, userId },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Proposition introuvable' },
        { status: 404 }
      )
    }

    // Construire les données à mettre à jour
    const data: any = {}
    if (status) data.status = status
    if (scheduledFor !== undefined) {
      if (scheduledFor === null) {
        data.scheduledFor = null
      } else {
        const parsed = new Date(scheduledFor)
        if (isNaN(parsed.getTime())) {
          return NextResponse.json(
            { success: false, error: 'scheduledFor doit être une date ISO valide' },
            { status: 400 }
          )
        }
        // Ne pas permettre de planifier dans le passé
        if (parsed.getTime() < Date.now()) {
          return NextResponse.json(
            { success: false, error: 'scheduledFor doit être dans le futur' },
            { status: 400 }
          )
        }
        data.scheduledFor = parsed
        // Si on planifie et que le status est pending, passer à approved
        // (le cron scheduled-publish ne publie que les approved)
        if (!status && existing.status === 'pending') {
          data.status = 'approved'
        }
      }
    }

    const updated = await db.postProposal.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('[PATCH /api/proposals]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
