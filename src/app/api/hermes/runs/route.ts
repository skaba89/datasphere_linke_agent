import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getHermesRuns } from '@/lib/hermes'

// ============================================================
// GET /api/hermes/runs
// Liste l'historique des runs Hermes pour l'utilisateur courant
//
// Query params:
//   - limit : nombre max (défaut 20, max 100)
// ============================================================

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    const runs = await getHermesRuns(userId, limit)
    return NextResponse.json({ success: true, data: runs })
  } catch (error: any) {
    console.error('[GET /api/hermes/runs]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
