import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    const sequences = await db.crmSequence.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ success: true, data: sequences })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    const body = await request.json()
    if (!body.name) return NextResponse.json({ success: false, error: 'Nom requis' }, { status: 400 })
    const sequence = await db.crmSequence.create({ data: { userId, name: body.name, description: body.description || null, steps: body.steps || [] } })
    return NextResponse.json({ success: true, data: sequence }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
