import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import Stripe from 'stripe'

// ============================================================
// POST /api/stripe/webhook
// Reçoit les événements Stripe (signature vérifiée)
//
// Événements gérés :
//   - checkout.session.completed         : marquer plan + trialEndsAt=null
//   - customer.subscription.updated      : update plan si changement
//   - customer.subscription.deleted      : downgrade vers free
//   - invoice.payment_failed             : marquer payment_failed
// ============================================================

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[Stripe webhook] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  const stripe = getStripe()
  const body = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('[Stripe webhook] Signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan
        if (userId && plan) {
          await db.user.update({
            where: { id: userId },
            data: {
              plan,
              trialEndsAt: null, // désactive le trial, bascule sur l'abonnement payant
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              stripeSubscriptionStatus: 'active',
            },
          })
          console.log(`[Stripe] User ${userId} upgraded to ${plan}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        const plan = sub.metadata?.plan
        if (userId && plan) {
          await db.user.update({
            where: { id: userId },
            data: {
              plan,
              stripeSubscriptionId: sub.id,
              stripeSubscriptionStatus: sub.status,
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (userId) {
          await db.user.update({
            where: { id: userId },
            data: {
              plan: 'free',
              stripeSubscriptionId: null,
              stripeSubscriptionStatus: 'canceled',
            },
          })
          console.log(`[Stripe] User ${userId} subscription canceled -> free`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        if (customerId) {
          const user = await db.user.findFirst({
            where: { stripeCustomerId: customerId },
          })
          if (user) {
            await db.user.update({
              where: { id: user.id },
              data: { stripeSubscriptionStatus: 'past_due' },
            })
            console.log(`[Stripe] User ${user.id} payment failed`)
          }
        }
        break
      }

      default:
        // Événement non géré - on log pour debug
        console.log(`[Stripe webhook] Unhandled event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[Stripe webhook] Handler error:', err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
