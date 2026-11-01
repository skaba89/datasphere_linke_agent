import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// DELETE /api/agent-workspace/memory/[key]
// Delete a memory entry by key
// ============================================================

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { key } = await params

    const entry = await db.agentMemory.findUnique({
      where: { userId_key: { userId, key } },
    })
    if (!entry) return NextResponse.json({ success: false, error: 'Entrée introuvable' }, { status: 404 })

    await db.agentMemory.delete({ where: { id: entry.id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/agent-workspace/memory/[key]]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
