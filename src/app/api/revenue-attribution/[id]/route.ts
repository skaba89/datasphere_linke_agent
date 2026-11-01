import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// DELETE /api/revenue-attribution/[id]
// Delete a revenue attribution entry
// ============================================================

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { id } = await params

    const entry = await db.revenueAttribution.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!entry) {
      return NextResponse.json({ success: false, error: 'Entrée introuvable' }, { status: 404 })
    }
    if (entry.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    }

    await db.revenueAttribution.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/revenue-attribution/[id]]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
