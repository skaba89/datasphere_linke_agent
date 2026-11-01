import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// GET /api/revenue-attribution/export
// Export revenue entries as CSV
//
// Query params:
//   - period: 30d | 90d | ytd | all (défaut: all)
//   - clientId: filter by client
//   - prospectId: filter by prospect
// ============================================================

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    // Plan gate
    const user = await db.user.findUnique({ where: { id: userId }, select: { plan: true, role: true } })
    const plan = (user?.plan || 'free').toLowerCase()
    const isAdmin = user?.role === 'admin'
    if (!isAdmin && plan !== 'business' && plan !== 'agency') {
      return NextResponse.json(
        { success: false, error: 'Revenue Attribution est réservé aux plans Business et Agency.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all'
    const clientId = searchParams.get('clientId')
    const prospectId = searchParams.get('prospectId')

    const where: any = { userId }
    if (clientId) where.clientId = clientId
    if (prospectId) where.prospectId = prospectId

    if (period && period !== 'all') {
      const now = new Date()
      let start: Date
      if (period === '30d') start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      else if (period === '90d') start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      else if (period === 'ytd') start = new Date(now.getFullYear(), 0, 1)
      else start = new Date(0)
      where.attributedAt = { gte: start }
    }

    const entries = await db.revenueAttribution.findMany({
      where,
      orderBy: { attributedAt: 'desc' },
      include: {
        client: { select: { name: true } },
        prospect: { select: { name: true } },
      },
    })

    // CSV generation
    const header = ['date', 'amount', 'currency', 'source', 'client', 'prospect', 'description']
    const escapeCsv = (v: string | null | undefined) => {
      if (v === null || v === undefined) return ''
      const s = String(v)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }

    const rows = entries.map(e => [
      e.attributedAt.toISOString(),
      (e.amountCents / 100).toFixed(2), // convert cents to euros
      e.currency,
      e.source,
      e.client?.name || '',
      e.prospect?.name || '',
      e.description || '',
    ].map(escapeCsv).join(','))

    const csv = [header.join(','), ...rows].join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="revenue-${period}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/revenue-attribution/export]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
