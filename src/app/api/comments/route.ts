import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { generateCommentReply } from '@/lib/automation'

// GET /api/comments - liste des commentaires à traiter
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    const replies = await db.commentReply.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 })
    return NextResponse.json({ success: true, data: replies })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}

// POST /api/comments - soumettre un commentaire reçu (manuellement ou via extension)
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { commenterName, commenterText, linkedinPostId, postProposalId } = await request.json()
    if (!commenterName || !commenterText) return NextResponse.json({ success: false, error: 'commenterName et commenterText requis' }, { status: 400 })

    // Récupérer le contenu du post
    let postContent = ''
    if (postProposalId) {
      const post = await db.postProposal.findFirst({ where: { id: postProposalId, userId }, select: { content: true } })
      postContent = post?.content || ''
    }

    const settings = await db.smartPosterSettings.findUnique({ where: { userId }, select: { tone: true } })

    // Générer la réponse IA immédiatement
    const { reply, sentiment } = await generateCommentReply({
      commenterName, commenterText, postContent, userTone: settings?.tone || 'Professionnel mais accessible',
    })

    const comment = await db.commentReply.create({
      data: { userId, commenterName, commenterText, linkedinPostId: linkedinPostId || null, postProposalId: postProposalId || null, generatedReply: reply, sentiment, status: 'pending' },
    })

    return NextResponse.json({ success: true, data: comment }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
