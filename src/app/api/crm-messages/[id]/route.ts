import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// PATCH /api/crm-messages/[id]
// Edit a draft message (subject, body)
// Only drafts can be edited
//
// DELETE /api/crm-messages/[id]
// Delete a message
// ============================================================

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    const message = await db.crmMessage.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    })

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message introuvable' }, { status: 404 })
    }
    if (message.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    }
    if (message.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: 'Seuls les brouillons peuvent être modifiés' },
        { status: 400 }
      )
    }

    const data: any = {}
    if (body.subject !== undefined) {
      if (typeof body.subject !== 'string' || body.subject.trim().length === 0) {
        return NextResponse.json({ success: false, error: 'Sujet invalide' }, { status: 400 })
      }
      data.subject = body.subject.trim()
    }
    if (body.body !== undefined) {
      if (typeof body.body !== 'string') {
        return NextResponse.json({ success: false, error: 'Body invalide' }, { status: 400 })
      }
      data.body = body.body
    }

    const updated = await db.crmMessage.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('[PATCH /api/crm-messages/[id]]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { id } = await params

    const message = await db.crmMessage.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message introuvable' }, { status: 404 })
    }
    if (message.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    }

    await db.crmMessage.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/crm-messages/[id]]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
