import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { decodeCursor, normalizeLimit, buildPaginationResult } from '@/lib/pagination'

// ============================================================
// GET /api/admin/audit-log
// Liste les entrées du journal d'audit (admin only)
//
// Query params (cursor-based pagination):
//   - action : filtrer par action (ex: user.ban)
//   - actorId : filtrer par acteur
//   - limit : nombre max (défaut: 50, max: 200)
//   - cursor : curseur de la page précédente
// ============================================================

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    // Vérifier que l'utilisateur est admin
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    if (user?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé — admin uniquement' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const actorId = searchParams.get('actorId')
    const limit = Math.min(normalizeLimit(parseInt(searchParams.get('limit') || '50')), 200)
    const cursor = searchParams.get('cursor') || undefined

    const cursorId = cursor ? decodeCursor(cursor) : null
    let cursorItem: { id: string; createdAt: Date } | null = null
    if (cursorId) {
      cursorItem = await db.auditLog.findUnique({
        where: { id: cursorId },
        select: { id: true, createdAt: true },
      })
      if (!cursorItem) {
        return NextResponse.json({ success: false, error: 'Curseur invalide' }, { status: 400 })
      }
    }

    const where: any = {}
    if (action) where.action = action
    if (actorId) where.actorId = actorId
    if (cursorItem) {
      where.OR = [
        { createdAt: { lt: cursorItem.createdAt } },
        { createdAt: cursorItem.createdAt, id: { lt: cursorItem.id } },
      ]
    }

    const logs = await db.auditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })

    const result = buildPaginationResult(logs, limit)

    return NextResponse.json({
      success: true,
      data: result.data,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    })
  } catch (error: any) {
    console.error('[GET /api/admin/audit-log]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
