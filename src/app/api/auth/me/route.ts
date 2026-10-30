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
