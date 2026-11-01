import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// PATCH /api/sequences/[id]
// Update a CRM sequence (name, description, steps, active)
//
// DELETE /api/sequences/[id]
// Delete a sequence (CrmMessage.sequenceId is SetNull, messages preserved)
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

    // Verify ownership
    const existing = await db.crmSequence.findFirst({ where: { id, userId } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Séquence introuvable' }, { status: 404 })
    }

    const data: any = {}
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length < 1) {
        return NextResponse.json({ success: false, error: 'Nom invalide' }, { status: 400 })
      }
      data.name = body.name.trim()
    }
    if (body.description !== undefined) data.description = body.description || null
    if (body.active !== undefined) data.active = Boolean(body.active)
    if (body.steps !== undefined) {
      if (!Array.isArray(body.steps)) {
        return NextResponse.json({ success: false, error: 'steps doit être un tableau' }, { status: 400 })
      }
      // Validate each step
      for (const step of body.steps) {
        if (typeof step.day !== 'number' || step.day < 1) {
          return NextResponse.json({ success: false, error: 'Chaque étape doit avoir un day (nombre >= 1)' }, { status: 400 })
        }
        if (!step.subject || typeof step.subject !== 'string') {
          return NextResponse.json({ success: false, error: 'Chaque étape doit avoir un subject' }, { status: 400 })
        }
        if (!step.body || typeof step.body !== 'string') {
          return NextResponse.json({ success: false, error: 'Chaque étape doit avoir un body' }, { status: 400 })
        }
      }
      data.steps = body.steps
    }

    const updated = await db.crmSequence.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('[PATCH /api/sequences/[id]]', error)
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

    // Verify ownership
    const existing = await db.crmSequence.findFirst({ where: { id, userId } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Séquence introuvable' }, { status: 404 })
    }

    // Delete the sequence (CrmMessage.sequenceId is SetNull via schema)
    await db.crmSequence.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/sequences/[id]]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
