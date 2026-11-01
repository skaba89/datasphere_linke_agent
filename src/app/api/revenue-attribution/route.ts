import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// /api/revenue-attribution
//
// GET  — list revenue entries (filter by clientId/prospectId/period)
// POST — create a revenue entry
//        Body: { clientId?, prospectId?, amountCents, currency?, source?, description?, attributedAt? }
//
// Plan gate: Business+
// ============================================================

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

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
    const clientId = searchParams.get('clientId')
    const prospectId = searchParams.get('prospectId')
    const period = searchParams.get('period') // 30d | 90d | ytd | all

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
        client: { select: { id: true, name: true, color: true } },
        prospect: { select: { id: true, name: true, company: true } },
      },
      take: 200,
    })

    // ─── Aggregate stats ───
    const totalCents = entries.reduce((s, e) => s + e.amountCents, 0)
    const byClient: Record<string, { name: string; color: string; totalCents: number; count: number }> = {}
    const byProspect: Record<string, { name: string; totalCents: number; count: number }> = {}
    const byMonth: Record<string, number> = {}

    for (const e of entries) {
      const key = e.clientId || 'unattributed'
      if (e.client) {
        if (!byClient[key]) byClient[key] = { name: e.client.name, color: e.client.color, totalCents: 0, count: 0 }
        byClient[key].totalCents += e.amountCents
        byClient[key].count++
      }
      if (e.prospect) {
        if (!byProspect[e.prospect.id]) byProspect[e.prospect.id] = { name: e.prospect.name, totalCents: 0, count: 0 }
        byProspect[e.prospect.id].totalCents += e.amountCents
        byProspect[e.prospect.id].count++
      }
      const monthKey = new Date(e.attributedAt).toISOString().slice(0, 7) // YYYY-MM
      byMonth[monthKey] = (byMonth[monthKey] || 0) + e.amountCents
    }

    return NextResponse.json({
      success: true,
      data: entries,
      stats: {
        totalCents,
        totalEntries: entries.length,
        byClient: Object.entries(byClient).map(([k, v]) => ({ id: k, ...v })),
        byProspect: Object.entries(byProspect).map(([k, v]) => ({ id: k, ...v })),
        byMonth,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/revenue-attribution]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const user = await db.user.findUnique({ where: { id: userId }, select: { plan: true, role: true } })
    const plan = (user?.plan || 'free').toLowerCase()
    const isAdmin = user?.role === 'admin'
    if (!isAdmin && plan !== 'business' && plan !== 'agency') {
      return NextResponse.json(
        { success: false, error: 'Revenue Attribution est réservé aux plans Business et Agency.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { clientId, prospectId, amountCents, currency, source, description, attributedAt } = body

    if (!amountCents || typeof amountCents !== 'number' || amountCents <= 0) {
      return NextResponse.json({ success: false, error: 'amountCents doit être un nombre positif' }, { status: 400 })
    }
    if (amountCents > 1_000_000_00) {
      return NextResponse.json({ success: false, error: 'Montant trop élevé (max 1M)' }, { status: 400 })
    }
    if (!clientId && !prospectId) {
      return NextResponse.json({ success: false, error: 'clientId ou prospectId requis' }, { status: 400 })
    }

    // Verify ownership
    if (clientId) {
      const c = await db.client.findFirst({ where: { id: clientId, userId } })
      if (!c) return NextResponse.json({ success: false, error: 'Client introuvable' }, { status: 404 })
    }
    if (prospectId) {
      const p = await db.prospect.findFirst({ where: { id: prospectId, userId } })
      if (!p) return NextResponse.json({ success: false, error: 'Prospect introuvable' }, { status: 404 })
    }

    const validSources = ['manual', 'stripe', 'import']
    const finalSource = validSources.includes(source) ? source : 'manual'

    const entry = await db.revenueAttribution.create({
      data: {
        userId,
        clientId: clientId || null,
        prospectId: prospectId || null,
        amountCents: Math.round(amountCents),
        currency: currency || 'EUR',
        source: finalSource,
        description: description || null,
        attributedAt: attributedAt ? new Date(attributedAt) : new Date(),
      },
    })

    // Audit log (fix B6)
    const { logAuditAction, extractRequestInfo } = await import('@/lib/audit-log')
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await logAuditAction({
      actorId: userId,
      actorEmail: '',
      action: 'revenue.create',
      targetType: 'RevenueAttribution',
      targetId: entry.id,
      details: { amountCents: entry.amountCents, source: finalSource, clientId, prospectId },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ success: true, data: entry }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/revenue-attribution]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
