import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// POST /api/sequences/[id]/enroll
// Enroll a prospect in a CRM sequence
//
// Body: { prospectId: string }
// Creates a CrmMessage with status='draft', stepIndex=0, sequenceId set
// so processCrmSequences (automation.ts) can advance it.
// ============================================================

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { id: sequenceId } = await params
    const body = await request.json()
    const { prospectId } = body

    if (!prospectId) {
      return NextResponse.json({ success: false, error: 'prospectId requis' }, { status: 400 })
    }

    // Verify ownership of both sequence and prospect
    const [sequence, prospect] = await Promise.all([
      db.crmSequence.findFirst({ where: { id: sequenceId, userId } }),
      db.prospect.findFirst({ where: { id: prospectId, userId }, select: { id: true, name: true, stage: true } }),
    ])

    if (!sequence) {
      return NextResponse.json({ success: false, error: 'Séquence introuvable' }, { status: 404 })
    }
    if (!prospect) {
      return NextResponse.json({ success: false, error: 'Prospect introuvable' }, { status: 404 })
    }
    if (!sequence.active) {
      return NextResponse.json({ success: false, error: 'Séquence inactive' }, { status: 400 })
    }

    // Check if prospect is already enrolled in this sequence
    const existingEnrollment = await db.crmMessage.findFirst({
      where: { prospectId, sequenceId },
      select: { id: true },
    })
    if (existingEnrollment) {
      return NextResponse.json(
        { success: false, error: 'Ce prospect est déjà inscrit dans cette séquence' },
        { status: 409 }
      )
    }

    // Get the first step
    const steps = sequence.steps as any[]
    if (!Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json({ success: false, error: 'Séquence vide (aucune étape)' }, { status: 400 })
    }

    const firstStep = steps[0]

    // Create the first message draft (stepIndex=0, sequenceId set)
    const message = await db.crmMessage.create({
      data: {
        userId,
        prospectId,
        sequenceId,
        stepIndex: 0,
        subject: firstStep.subject || `Étape 1 — ${prospect.name}`,
        body: firstStep.body || '',
        status: 'draft',
      },
    })

    // Update prospect stage to 'contacted' if currently 'new'
    if (prospect.stage === 'new') {
      await db.prospect.update({
        where: { id: prospectId },
        data: { stage: 'contacted' },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        messageId: message.id,
        sequenceId,
        prospectId,
        stepIndex: 0,
        message: `${prospect.name} inscrit dans la séquence "${sequence.name}"`,
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/sequences/[id]/enroll]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
