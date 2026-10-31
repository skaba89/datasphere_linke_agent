import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { revokeApiKey } from '@/lib/api-keys'

// ============================================================
// DELETE /api/api-keys/[id]
// Révoque une clé API
// ============================================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { id } = await params
    const revoked = await revokeApiKey(userId, id)

    if (!revoked) {
      return NextResponse.json(
        { success: false, error: 'Clé introuvable' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/api-keys/[id]]', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
