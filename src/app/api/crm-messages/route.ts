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
    const message = await db.crmMessage.create({ data: { userId, prospectId: body.prospectId, sequenceId: body.sequenceId || null, stepIndex: body.stepIndex || null, subject: body.subject, body: body.body, status: body.status || 'draft', sentAt: body.status === 'sent' ? new Date() : null } })
    // Update prospect stage if message sent
    if (body.status === 'sent') {
      await db.prospect.update({ where: { id: body.prospectId }, data: { stage: 'contacted' } })
    }
    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
