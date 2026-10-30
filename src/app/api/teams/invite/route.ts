import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { inviteMember, getTeamWithMembers } from '@/lib/teams'
import { sendTeamInvitationEmail } from '@/lib/email'

// ============================================================
// POST /api/teams/invite
// Inviter un membre dans sa team
// Body: { email: string, role?: 'admin' | 'member' }
// ============================================================
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { email, role } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email requis' },
        { status: 400 }
      )
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Email invalide' },
        { status: 400 }
      )
    }

    // Vérifier que l'user courant a une team
    const team = await getTeamWithMembers(userId)
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Vous n\'avez pas d\'équipe. Créez-en une d\'abord.' },
        { status: 404 }
      )
    }

    // Vérifier le role du requester
    const requesterMember = team.members.find((m) => m.userId === userId)
    if (!requesterMember || !['owner', 'admin'].includes(requesterMember.role)) {
      return NextResponse.json(
        { success: false, error: 'Vous n\'avez pas la permission d\'inviter.' },
        { status: 403 }
      )
    }

    const result = await inviteMember(team.id, userId, email, role || 'member')

    // Envoyer l'email d'invitation (si Resend configuré)
    const requester = await db.user.findUnique({ where: { id: userId } })
    try {
      await sendTeamInvitationEmail({
        to: email.toLowerCase().trim(),
        teamName: team.name,
        inviterName: requester?.name || requester?.email || 'un utilisateur',
        invitationToken: result.token,
        isNewUser: result.isNewUser,
      })
    } catch (err: any) {
      console.warn('[Team invite] Email non envoyé:', err.message)
      // L'invitation est quand même créée, on continue
    }

    return NextResponse.json({
      success: true,
      data: {
        invitationId: result.invitationId,
        isNewUser: result.isNewUser,
        message: result.isNewUser
          ? `Invitation envoyée à ${email}. L'utilisateur devra créer un compte.`
          : `Invitation envoyée à ${email}.`,
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/teams/invite]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
