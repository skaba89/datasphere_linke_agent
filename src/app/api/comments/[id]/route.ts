import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// PATCH /api/comments/[id] - éditer/approuver/rejeter la réponse
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    const { id } = await params
    const body = await request.json()
    const existing = await db.commentReply.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ success: false, error: 'Commentaire introuvable' }, { status: 404 })

    const data: any = {}
    if (body.status) data.status = body.status // approved | rejected | sent
    if (body.editedReply !== undefined) { data.editedReply = body.editedReply; data.status = 'edited' }
    if (body.status === 'sent') data.repliedAt = new Date()

    const updated = await db.commentReply.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}

// DELETE
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    const { id } = await params
    await db.commentReply.deleteMany({ where: { id, userId } })
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
