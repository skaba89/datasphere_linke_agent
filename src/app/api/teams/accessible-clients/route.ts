import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { listAccessibleClients } from '@/lib/teams'

// ============================================================
// GET /api/teams/accessible-clients
// Liste les clients accessibles par le user courant :
//   - Clients qu'il possède (permission=manage)
//   - Clients assignés via team membership (permission selon assignment)
//   - Si owner/admin d'une team : tous les clients du team owner (manage)
// ============================================================

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const clients = await listAccessibleClients(userId)
    return NextResponse.json({ success: true, data: clients })
  } catch (error: any) {
    console.error('[GET /api/teams/accessible-clients]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
