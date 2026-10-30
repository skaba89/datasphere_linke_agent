import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { removeMember } from '@/lib/teams'

// ============================================================
// DELETE /api/teams/members/[id]
// Retire un membre de la team (id = userId du membre à retirer)
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

    const { id: memberUserId } = await params

    // Récupérer la team de l'user courant
    const team = await getCurrentUserTeam(userId)
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Vous n\'avez pas d\'équipe' },
        { status: 404 }
      )
    }

    await removeMember(team.id, userId, memberUserId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/teams/members/[id]]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// Helper (évite la duplication)
async function getCurrentUserTeam(userId: string) {
  const { getTeamWithMembers } = await import('@/lib/teams')
  return await getTeamWithMembers(userId)
}
