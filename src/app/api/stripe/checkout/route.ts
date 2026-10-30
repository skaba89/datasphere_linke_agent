import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { getStripe, PLAN_TO_STRIPE_PRICE, getAppUrl } from '@/lib/stripe'

// ============================================================
// POST /api/stripe/checkout
// Crée une session Stripe Checkout pour souscrire à un plan
// Body: { plan: 'pro' | 'business' }
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

    const { plan } = await request.json()
    if (!plan || !['pro', 'business'].includes(plan)) {
      return NextResponse.json(
        { success: false, error: 'Plan invalide (pro ou business)' },
        { status: 400 }
      )
    }

    const priceId = PLAN_TO_STRIPE_PRICE[plan]
    if (!priceId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prix Stripe non configuré pour ce plan. Contactez le support.',
        },
        { status: 500 }
      )
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur introuvable' },
        { status: 404 }
      )
    }

    const stripe = getStripe()
    const appUrl = getAppUrl(request)

    // Créer ou récupérer le customer Stripe
    let customerId = user.stripeCustomerId || undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user.id },
      })
      customerId = customer.id
      await db.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Créer la session Checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/?upgrade=success&plan=${plan}`,
      cancel_url: `${appUrl}/pricing?upgrade=cancelled`,
      metadata: { userId, plan },
      subscription_data: {
        metadata: { userId, plan },
      },
    })

    return NextResponse.json({
      success: true,
      data: { url: session.url, sessionId: session.id },
    })
  } catch (error: any) {
    console.error('[POST /api/stripe/checkout]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
