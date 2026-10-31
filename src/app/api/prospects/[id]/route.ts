import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    const { id } = await params
    const body = await request.json()
    const existing = await db.prospect.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ success: false, error: 'Prospect introuvable' }, { status: 404 })
    const data: any = {}
    for (const f of ['name','linkedinUrl','email','company','title','stage','notes','tags']) {
      if (body[f] !== undefined) data[f] = body[f]
    }
    const updated = await db.prospect.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    const { id } = await params
    const existing = await db.prospect.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ success: false, error: 'Prospect introuvable' }, { status: 404 })
    await db.prospect.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
