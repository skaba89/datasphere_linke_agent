import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// PATCH /api/clients/[id]
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const existing = await db.client.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ success: false, error: 'Client introuvable' }, { status: 404 })

    const data: any = {}
    if (body.name !== undefined) data.name = body.name
    if (body.monthlyGoal !== undefined) data.monthlyGoal = body.monthlyGoal
    if (body.color !== undefined) data.color = body.color
    if (body.active !== undefined) data.active = body.active
    if (body.linkedinAccountId !== undefined) data.linkedinAccountId = body.linkedinAccountId

    const client = await db.client.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: client })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE /api/clients/[id]
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const existing = await db.client.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ success: false, error: 'Client introuvable' }, { status: 404 })

    await db.client.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
