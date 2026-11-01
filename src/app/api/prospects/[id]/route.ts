import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { scoreProspect } from '@/lib/prospect-scoring'

// ============================================================
// Valid prospect stages
// ============================================================
const VALID_STAGES = ['new', 'contacted', 'replied', 'meeting', 'won', 'lost']

// ============================================================
// GET /api/prospects/[id]
// Récupère le détail d'un prospect avec messages, tâches, revenus
// ============================================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { id } = await params

    const prospect = await db.prospect.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: { id: true, subject: true, body: true, status: true, createdAt: true, sentAt: true, sequenceId: true },
        },
        agentTasks: {
          where: { prospectId: id },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { id: true, title: true, type: true, status: true, priority: true, dueAt: true, completedAt: true },
        },
        revenueAttributions: {
          orderBy: { attributedAt: 'desc' },
          take: 10,
          select: { id: true, amountCents: true, currency: true, source: true, description: true, attributedAt: true },
        },
      },
    })

    if (!prospect) {
      return NextResponse.json({ success: false, error: 'Prospect introuvable' }, { status: 404 })
    }

    // Compute totals
    const totalRevenue = prospect.revenueAttributions.reduce((s, r) => s + r.amountCents, 0)
    const messageStats = {
      total: prospect.messages.length,
      sent: prospect.messages.filter(m => m.status === 'sent').length,
      draft: prospect.messages.filter(m => m.status === 'draft').length,
      replied: prospect.messages.filter(m => m.status === 'replied').length,
    }
    const taskStats = {
      total: prospect.agentTasks.length,
      todo: prospect.agentTasks.filter(t => t.status === 'todo').length,
      done: prospect.agentTasks.filter(t => t.status === 'done').length,
    }

    return NextResponse.json({
      success: true,
      data: prospect,
      stats: {
        messageStats,
        taskStats,
        totalRevenueCents: totalRevenue,
        revenueCount: prospect.revenueAttributions.length,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// PATCH /api/prospects/[id]
// Met à jour un prospect (avec validation de stage + re-scoring)
// ============================================================
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    const existing = await db.prospect.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ success: false, error: 'Prospect introuvable' }, { status: 404 })

    const data: any = {}
    for (const f of ['name', 'linkedinUrl', 'email', 'company', 'title', 'notes', 'tags']) {
      if (body[f] !== undefined) data[f] = body[f]
    }

    // Stage validation (B5 fix)
    if (body.stage !== undefined) {
      if (!VALID_STAGES.includes(body.stage)) {
        return NextResponse.json(
          { success: false, error: `Stage invalide. Valeurs autorisées: ${VALID_STAGES.join(', ')}` },
          { status: 400 }
        )
      }
      data.stage = body.stage

      // Auto-set wonAt/lostAt timestamps on stage transition
      if (body.stage === 'won' && existing.stage !== 'won') {
        data.wonAt = new Date()
        data.lostAt = null // clear lostAt if moving to won
      } else if (body.stage === 'lost' && existing.stage !== 'lost') {
        data.lostAt = new Date()
        data.wonAt = null // clear wonAt if moving to lost
      }
    }

    // Dedup check on email change (B4 fix for PATCH)
    if (body.email !== undefined && body.email) {
      const email = String(body.email).trim().toLowerCase()
      const dup = await db.prospect.findFirst({
        where: { userId, email, NOT: { id } },
        select: { id: true, name: true },
      })
      if (dup) {
        return NextResponse.json(
          { success: false, error: `Un prospect avec cet email existe déjà: ${dup.name}`, duplicateId: dup.id },
          { status: 409 }
        )
      }
      data.email = email
    }

    const updated = await db.prospect.update({ where: { id }, data })

    // Re-score the prospect after changes
    try {
      await scoreProspect(id)
      // Re-fetch with updated score
      const withScore = await db.prospect.findUnique({ where: { id } })
      if (withScore) updated.score = withScore.score
    } catch {
      // Scoring failure should not block the update
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// DELETE /api/prospects/[id]
// ============================================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const existing = await db.prospect.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ success: false, error: 'Prospect introuvable' }, { status: 404 })

    await db.prospect.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
