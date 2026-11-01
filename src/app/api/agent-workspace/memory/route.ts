import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// /api/agent-workspace/memory
//
// GET  — list all memory entries for user
// POST — upsert memory entry (key + value + category)
// ============================================================

const VALID_CATEGORIES = ['general', 'preference', 'fact', 'goal']

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const memory = await db.agentMemory.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: memory })
  } catch (error: any) {
    console.error('[GET /api/agent-workspace/memory]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { key, value, category } = body

    if (!key || typeof key !== 'string' || key.trim().length < 1) {
      return NextResponse.json({ success: false, error: 'Clé requise' }, { status: 400 })
    }
    if (!value || typeof value !== 'string' || value.trim().length < 1) {
      return NextResponse.json({ success: false, error: 'Valeur requise' }, { status: 400 })
    }
    if (key.length > 100) {
      return NextResponse.json({ success: false, error: 'Clé trop longue (100 caractères max.)' }, { status: 400 })
    }
    if (value.length > 2000) {
      return NextResponse.json({ success: false, error: 'Valeur trop longue (2000 caractères max.)' }, { status: 400 })
    }

    const finalCategory = VALID_CATEGORIES.includes(category) ? category : 'general'

    // Upsert: unique constraint on (userId, key)
    const entry = await db.agentMemory.upsert({
      where: { userId_key: { userId, key: key.trim() } },
      update: { value: value.trim(), category: finalCategory },
      create: {
        userId,
        key: key.trim(),
        value: value.trim(),
        category: finalCategory,
      },
    })

    return NextResponse.json({ success: true, data: entry }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/agent-workspace/memory]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
