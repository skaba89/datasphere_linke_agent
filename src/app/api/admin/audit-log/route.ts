import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// GET /api/admin/audit-log
// Liste les entrées du journal d'audit (admin only)
//
// Query params:
//   - action : filtrer par action (ex: user.ban)
//   - actorId : filtrer par acteur
//   - limit : nombre max (défaut: 50, max: 200)
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    const where: any = {}
    if (action) where.action = action
    if (actorId) where.actorId = actorId

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error: any) {
    console.error('[GET /api/admin/audit-log]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
