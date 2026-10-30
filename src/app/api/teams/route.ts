import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { getTeamWithMembers, getUserTeam } from '@/lib/teams'

// ============================================================
// GET /api/teams
// Retourne la team de l'utilisateur courant (avec members + invitations)
// ============================================================
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const team = await getTeamWithMembers(userId)

    return NextResponse.json({
      success: true,
      data: team,
    })
  } catch (error: any) {
    console.error('[GET /api/teams]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST /api/teams
// Crée une team (uniquement pour plan Business)
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

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur introuvable' },
        { status: 404 }
      )
    }

    // Vérifier le plan
    const trialActive = user.trialEndsAt ? new Date(user.trialEndsAt) > new Date() : false
    const effectivePlan = trialActive ? 'pro' : user.plan
    if (effectivePlan !== 'business') {
      return NextResponse.json(
        {
          success: false,
          error: 'Fonctionnalité réservée au plan Business. Passez à l\'offre supérieure.',
          upgrade: true,
        },
        { status: 402 }
      )
    }

    // Vérifier qu'une team n'existe pas déjà
    const existingTeam = await getUserTeam(userId)
    if (existingTeam) {
      return NextResponse.json(
        { success: false, error: 'Vous avez déjà une équipe.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const name = body.name?.trim() || `Équipe de ${user.name || user.email}`

    const { createTeamForBusinessUser } = await import('@/lib/teams')
    const teamId = await createTeamForBusinessUser(userId, user.name || user.email)

    // Renommer si fourni
    if (body.name) {
      await db.team.update({ where: { id: teamId }, data: { name } })
    }

    const team = await db.team.findUnique({ where: { id: teamId } })

    return NextResponse.json({
      success: true,
      data: team,
    }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/teams]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
