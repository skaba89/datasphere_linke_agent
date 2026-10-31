import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { setSentryUser } from '@/lib/sentry'

// ============================================================
// GET /api/auth/me
// Retourne l'utilisateur courant (null si non authentifié)
// Utilisé par le frontend pour hydrater l'état d'auth au refresh
// ============================================================
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      // Clear Sentry context
      setSentryUser(null)
      return NextResponse.json({ success: true, data: null })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        trialEndsAt: true,
        createdAt: true,
      },
    })

    if (!user) {
      setSentryUser(null)
      return NextResponse.json({ success: true, data: null })
    }

    // Set Sentry context pour les futures erreurs
    setSentryUser({ id: user.id, email: user.email, plan: user.plan })

    // Indiquer si le trial est encore actif
    const trialActive = user.trialEndsAt ? new Date(user.trialEndsAt) > new Date() : false

    return NextResponse.json({
      success: true,
      data: { ...user, trialActive },
    })
  } catch (error: any) {
    console.error('[GET /api/auth/me]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// PATCH /api/auth/me
// Met à jour le profil de l'utilisateur courant (nom)
// ============================================================
export async function PATCH(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data: any = {}

    if (body.name !== undefined) {
      data.name = String(body.name).trim().slice(0, 100) || null
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rien à mettre à jour' },
        { status: 400 }
      )
    }

    const updated = await db.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, name: true, role: true, plan: true, trialEndsAt: true, createdAt: true },
    })

    const trialActive = updated.trialEndsAt ? new Date(updated.trialEndsAt) > new Date() : false

    return NextResponse.json({
      success: true,
      data: { ...updated, trialActive },
    })
  } catch (error: any) {
    console.error('[PATCH /api/auth/me]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
