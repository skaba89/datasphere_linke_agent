import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// /api/agent-workspace/tasks
//
// GET  — list tasks (filter by status)
// POST — create a task
//        Body: { title, description?, type?, priority?, dueAt?, input? }
// ============================================================

const VALID_TYPES = ['custom', 'generate_post', 'analyze_profile', 'reach_out', 'follow_up']
const VALID_STATUSES = ['todo', 'in_progress', 'done', 'blocked']
const VALID_PRIORITIES = ['low', 'medium', 'high']

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = { userId }
    if (status && VALID_STATUSES.includes(status)) where.status = status

    const tasks = await db.agentTask.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // todo first, then in_progress, then done/blocked
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 100,
    })

    return NextResponse.json({ success: true, data: tasks })
  } catch (error: any) {
    console.error('[GET /api/agent-workspace/tasks]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { title, description, type, priority, dueAt, input } = body

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json({ success: false, error: 'Titre requis (3 caractères min.)' }, { status: 400 })
    }
    if (title.length > 200) {
      return NextResponse.json({ success: false, error: 'Titre trop long (200 caractères max.)' }, { status: 400 })
    }

    const finalType = VALID_TYPES.includes(type) ? type : 'custom'
    const finalPriority = VALID_PRIORITIES.includes(priority) ? priority : 'medium'

    const task = await db.agentTask.create({
      data: {
        userId,
        title: title.trim(),
        description: description?.trim() || null,
        type: finalType,
        priority: finalPriority,
        dueAt: dueAt ? new Date(dueAt) : null,
        input: input ? JSON.stringify(input) : null,
      },
    })

    return NextResponse.json({ success: true, data: task }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/agent-workspace/tasks]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
