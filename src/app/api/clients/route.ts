import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// GET /api/clients - liste les clients
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const clients = await db.client.findMany({
      where: { userId },
      include: { posts: { select: { id: true, status: true } } },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ success: true, data: clients })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/clients - créer un client
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { name, monthlyGoal, color } = await request.json()
    if (!name) return NextResponse.json({ success: false, error: 'Nom requis' }, { status: 400 })

    const client = await db.client.create({
      data: {
        userId,
        name: name.trim(),
        monthlyGoal: monthlyGoal || 20,
        color: color || '#10b981',
      },
    })

    return NextResponse.json({ success: true, data: client }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
