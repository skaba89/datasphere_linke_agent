import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// /api/agent-workspace/tasks/[id]
//
// PATCH  — update task (status, priority, output, agentNotes)
// DELETE — delete task
// ============================================================

const VALID_STATUSES = ['todo', 'in_progress', 'done', 'blocked']
const VALID_PRIORITIES = ['low', 'medium', 'high']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { status, priority, output, agentNotes, title, description, dueAt } = body

    const task = await db.agentTask.findUnique({ where: { id }, select: { userId: true } })
    if (!task) return NextResponse.json({ success: false, error: 'Tâche introuvable' }, { status: 404 })
    if (task.userId !== userId) return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })

    const data: any = {}
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ success: false, error: 'Statut invalide' }, { status: 400 })
      }
      data.status = status
      if (status === 'done') data.completedAt = new Date()
    }
    if (priority !== undefined) {
      if (!VALID_PRIORITIES.includes(priority)) {
        return NextResponse.json({ success: false, error: 'Priorité invalide' }, { status: 400 })
      }
      data.priority = priority
    }
    if (output !== undefined) data.output = typeof output === 'string' ? output : JSON.stringify(output)
    if (agentNotes !== undefined) data.agentNotes = agentNotes
    if (title !== undefined) data.title = String(title).slice(0, 200)
    if (description !== undefined) data.description = description
    if (dueAt !== undefined) data.dueAt = dueAt ? new Date(dueAt) : null

    const updated = await db.agentTask.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('[PATCH /api/agent-workspace/tasks/[id]]', error)
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
    const task = await db.agentTask.findUnique({ where: { id }, select: { userId: true } })
    if (!task) return NextResponse.json({ success: false, error: 'Tâche introuvable' }, { status: 404 })
    if (task.userId !== userId) return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })

    await db.agentTask.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/agent-workspace/tasks/[id]]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
