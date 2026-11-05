import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const prospectId = searchParams.get('prospectId')
    const where: any = { userId }
    if (prospectId) where.prospectId = prospectId
    const messages = await db.crmMessage.findMany({ where, orderBy: { createdAt: 'desc' }, include: { prospect: { select: { id: true, name: true } } } })
    return NextResponse.json({ success: true, data: messages })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    const body = await request.json()
    if (!body.prospectId || !body.subject || !body.body) return NextResponse.json({ success: false, error: 'prospectId, subject, body requis' }, { status: 400 })

    // A foreign prospect ID must never be linked to this user's CRM message.
    const ownedProspect = await db.prospect.findFirst({
      where: { id: body.prospectId, userId },
      select: { id: true },
    })
    if (!ownedProspect) {
      return NextResponse.json({ success: false, error: 'Prospect introuvable' }, { status: 404 })
    }

    // A sequence must also belong to the same user, if provided.
    if (body.sequenceId) {
      const ownedSequence = await db.crmSequence.findFirst({
        where: { id: body.sequenceId, userId },
        select: { id: true },
      })
      if (!ownedSequence) {
        return NextResponse.json({ success: false, error: 'Séquence introuvable' }, { status: 404 })
      }
    }

    // ⭐ P1 FIX: Force status='draft' on creation — 'sent' must go through /send endpoint
    // Only 'draft' is allowed at creation time to prevent bypassing the send flow
    const message = await db.crmMessage.create({
      data: {
        userId,
        prospectId: body.prospectId,
        sequenceId: body.sequenceId || null,
        stepIndex: body.stepIndex || null,
        subject: body.subject,
        body: body.body,
        status: 'draft', // Always draft — use POST /api/crm-messages/[id]/send to send
      },
    })
    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
