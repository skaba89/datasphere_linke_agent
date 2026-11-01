import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { runHermesForUser } from '@/lib/hermes'
import { logger } from '@/lib/logger'

// ============================================================
// POST /api/hermes/run
// Déclenche manuellement un run Hermes pour l'utilisateur courant
//
// Body: { trigger?: 'manual' | 'api' }
// ============================================================

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const trigger = (body.trigger === 'api' ? 'api' : 'manual') as 'manual' | 'api'

    logger.info({ userId, trigger }, 'Manual Hermes run triggered')

    const result = await runHermesForUser(userId, trigger)

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('[POST /api/hermes/run]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
