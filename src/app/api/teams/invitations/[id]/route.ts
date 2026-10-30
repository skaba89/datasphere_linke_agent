import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { revokeInvitation, getTeamWithMembers } from '@/lib/teams'

// ============================================================
// DELETE /api/teams/invitations/[id]
// Annule une invitation pending
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

    const { id: invitationId } = await params

    const team = await getTeamWithMembers(userId)
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Vous n\'avez pas d\'équipe' },
        { status: 404 }
      )
    }

    await revokeInvitation(team.id, userId, invitationId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/teams/invitations/[id]]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
