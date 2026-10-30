import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { getStripe, getAppUrl } from '@/lib/stripe'

// ============================================================
// POST /api/stripe/portal
// Redirige l'utilisateur vers le portail client Stripe
// (gérer sa carte, annuler, etc.)
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
    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { success: false, error: 'Aucun abonnement actif trouvé' },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    const appUrl = getAppUrl(request)

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/`,
    })

    return NextResponse.json({
      success: true,
      data: { url: portalSession.url },
    })
  } catch (error: any) {
    console.error('[POST /api/stripe/portal]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
