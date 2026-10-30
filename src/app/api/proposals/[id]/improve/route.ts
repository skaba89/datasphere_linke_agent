import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { improvePost } from '@/lib/ai'

// ============================================================
// POST /api/proposals/[id]/improve
// Améliore un post existant via LLM
// Body: { instruction: string } (ex: "Rendre plus provocateur")
// ============================================================
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const instruction = body.instruction || 'Améliore ce post pour maximiser l\'engagement'

    const proposal = await db.postProposal.findFirst({
      where: { id, userId },
    })
    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposition introuvable' },
        { status: 404 }
      )
    }

    const improvedContent = await improvePost(proposal.content, instruction)

    const updated = await db.postProposal.update({
      where: { id },
      data: { content: improvedContent },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error: any) {
    console.error('[POST /api/proposals/[id]/improve]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
