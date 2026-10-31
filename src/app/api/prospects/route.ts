import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    const prospects = await db.prospect.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { messages: { select: { id: true, status: true, subject: true } } } })
    return NextResponse.json({ success: true, data: prospects })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    const body = await request.json()
    if (!body.name) return NextResponse.json({ success: false, error: 'Nom requis' }, { status: 400 })
    const prospect = await db.prospect.create({ data: { userId, name: body.name, linkedinUrl: body.linkedinUrl || null, email: body.email || null, company: body.company || null, title: body.title || null, notes: body.notes || null, tags: body.tags || null, stage: body.stage || 'new' } })
    return NextResponse.json({ success: true, data: prospect }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
