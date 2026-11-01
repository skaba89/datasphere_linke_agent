import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { logAuditAction, extractRequestInfo } from '@/lib/audit-log'

// ============================================================
// PATCH /api/revenue-attribution/[id]
// Update a revenue attribution entry (fix B5 — was missing)
//
// DELETE /api/revenue-attribution/[id]
// Delete a revenue attribution entry (with audit log — fix B6)
// ============================================================

const VALID_SOURCES = ['manual', 'stripe', 'import']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    const entry = await db.revenueAttribution.findUnique({
      where: { id },
      select: { id: true, userId: true, amountCents: true, clientId: true, prospectId: true },
    })

    if (!entry) {
      return NextResponse.json({ success: false, error: 'Entrée introuvable' }, { status: 404 })
    }
    if (entry.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    }

    const data: any = {}

    if (body.amountCents !== undefined) {
      if (typeof body.amountCents !== 'number' || body.amountCents <= 0) {
        return NextResponse.json({ success: false, error: 'amountCents doit être un nombre positif' }, { status: 400 })
      }
      if (body.amountCents > 1_000_000_00) {
        return NextResponse.json({ success: false, error: 'Montant trop élevé (max 1M)' }, { status: 400 })
      }
      data.amountCents = Math.round(body.amountCents)
    }

    if (body.currency !== undefined) {
      if (typeof body.currency !== 'string' || body.currency.length !== 3) {
        return NextResponse.json({ success: false, error: 'currency doit être un code ISO 3 lettres' }, { status: 400 })
      }
      data.currency = body.currency.toUpperCase()
    }

    if (body.source !== undefined) {
      if (!VALID_SOURCES.includes(body.source)) {
        return NextResponse.json({ success: false, error: `source invalide (autorisés: ${VALID_SOURCES.join(', ')})` }, { status: 400 })
      }
      data.source = body.source
    }

    if (body.description !== undefined) {
      data.description = body.description || null
    }

    if (body.clientId !== undefined) {
      if (body.clientId) {
        const c = await db.client.findFirst({ where: { id: body.clientId, userId } })
        if (!c) return NextResponse.json({ success: false, error: 'Client introuvable' }, { status: 404 })
      }
      data.clientId = body.clientId || null
    }

    if (body.prospectId !== undefined) {
      if (body.prospectId) {
        const p = await db.prospect.findFirst({ where: { id: body.prospectId, userId } })
        if (!p) return NextResponse.json({ success: false, error: 'Prospect introuvable' }, { status: 404 })
      }
      data.prospectId = body.prospectId || null
    }

    if (body.attributedAt !== undefined) {
      data.attributedAt = body.attributedAt ? new Date(body.attributedAt) : new Date()
    }

    const updated = await db.revenueAttribution.update({ where: { id }, data })

    // Audit log (fix B6)
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await logAuditAction({
      actorId: userId,
      actorEmail: '', // will be filled by the audit log if needed
      action: 'revenue.update',
      targetType: 'RevenueAttribution',
      targetId: id,
      details: { before: { amountCents: entry.amountCents }, after: data },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('[PATCH /api/revenue-attribution/[id]]', error)
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

    const entry = await db.revenueAttribution.findUnique({
      where: { id },
      select: { id: true, userId: true, amountCents: true, clientId: true, prospectId: true },
    })

    if (!entry) {
      return NextResponse.json({ success: false, error: 'Entrée introuvable' }, { status: 404 })
    }
    if (entry.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    }

    await db.revenueAttribution.delete({ where: { id } })

    // Audit log (fix B6)
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await logAuditAction({
      actorId: userId,
      actorEmail: '',
      action: 'revenue.delete',
      targetType: 'RevenueAttribution',
      targetId: id,
      details: { amountCents: entry.amountCents, clientId: entry.clientId, prospectId: entry.prospectId },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/revenue-attribution/[id]]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
