import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getOrCreateHermesConfig, updateHermesConfig, ALL_WORKFLOW_STEPS } from '@/lib/hermes'

// ============================================================
// GET /api/hermes/config
// Récupère la config Hermes de l'utilisateur (crée une config par défaut si inexistante)
// ============================================================
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const config = await getOrCreateHermesConfig(userId)
    return NextResponse.json({
      success: true,
      data: config,
      meta: { availableSteps: [...ALL_WORKFLOW_STEPS] },
    })
  } catch (error: any) {
    console.error('[GET /api/hermes/config]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// ============================================================
// PUT /api/hermes/config
// Met à jour la config Hermes
// Body: { enabled?, scheduleCron?, maxTasksPerRun?, workflowSteps?, notifyOnDone?, notifyOnError? }
// ============================================================
export async function PUT(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const updates: any = {}

    if (body.enabled !== undefined) {
      if (typeof body.enabled !== 'boolean') {
        return NextResponse.json({ success: false, error: 'enabled doit être un booléen' }, { status: 400 })
      }
      updates.enabled = body.enabled
    }

    if (body.scheduleCron !== undefined) {
      if (typeof body.scheduleCron !== 'string' || body.scheduleCron.length > 100) {
        return NextResponse.json({ success: false, error: 'scheduleCron invalide' }, { status: 400 })
      }
      updates.scheduleCron = body.scheduleCron
    }

    if (body.maxTasksPerRun !== undefined) {
      const n = Number(body.maxTasksPerRun)
      if (!Number.isInteger(n) || n < 1 || n > 20) {
        return NextResponse.json({ success: false, error: 'maxTasksPerRun doit être entre 1 et 20' }, { status: 400 })
      }
      updates.maxTasksPerRun = n
    }

    if (body.workflowSteps !== undefined) {
      if (!Array.isArray(body.workflowSteps)) {
        return NextResponse.json({ success: false, error: 'workflowSteps doit être un tableau' }, { status: 400 })
      }
      // Validate each step
      const validSteps = body.workflowSteps.filter((s: string) =>
        (ALL_WORKFLOW_STEPS as readonly string[]).includes(s)
      )
      if (validSteps.length === 0) {
        return NextResponse.json({ success: false, error: 'Aucune étape valide' }, { status: 400 })
      }
      updates.workflowSteps = validSteps
    }

    if (body.notifyOnDone !== undefined) {
      if (typeof body.notifyOnDone !== 'boolean') {
        return NextResponse.json({ success: false, error: 'notifyOnDone doit être un booléen' }, { status: 400 })
      }
      updates.notifyOnDone = body.notifyOnDone
    }

    if (body.notifyOnError !== undefined) {
      if (typeof body.notifyOnError !== 'boolean') {
        return NextResponse.json({ success: false, error: 'notifyOnError doit être un booléen' }, { status: 400 })
      }
      updates.notifyOnError = body.notifyOnError
    }

    const config = await updateHermesConfig(userId, updates)
    return NextResponse.json({ success: true, data: config })
  } catch (error: any) {
    console.error('[PUT /api/hermes/config]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
