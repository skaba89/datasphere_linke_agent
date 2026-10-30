import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { acceptInvitation } from '@/lib/teams'

// ============================================================
// POST /api/teams/accept/[token]
// Accepte une invitation (lie le user courant à la team)
// ============================================================
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié. Créez un compte d\'abord.' },
        { status: 401 }
      )
    }

    const { token } = await params

    const result = await acceptInvitation(token, userId)

    return NextResponse.json({
      success: true,
      data: result,
      message: `Vous avez rejoint l'équipe "${result.teamName}" !`,
    })
  } catch (error: any) {
    console.error('[POST /api/teams/accept/[token]]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// GET /api/teams/accept/[token]
// Prévisualiser une invitation (avant acceptation)
// ============================================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invitation = await db.teamInvitation.findUnique({
      where: { token },
      include: { team: true },
    })

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invitation introuvable' },
        { status: 404 }
      )
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Invitation déjà ${invitation.status}` },
        { status: 400 }
      )
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Invitation expirée' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        teamName: invitation.team.name,
        role: invitation.role,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/teams/accept/[token]]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
