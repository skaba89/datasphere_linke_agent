import Stripe from 'stripe'

// ============================================================
// Stripe singleton
// ============================================================

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY manquant')
    }
    stripeInstance = new Stripe(key, {
      apiVersion: '2025-08-27.basil' as any,
      typescript: true,
    })
  }
  return stripeInstance
}

// ============================================================
// Mapping plan -> Price ID Stripe
// À configurer dans le dashboard Stripe et reporter ici via env
// ============================================================

export const STRIPE_PRICES = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
  business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
} as const

export const PLAN_TO_STRIPE_PRICE: Record<string, string | undefined> = {
  pro: STRIPE_PRICES.pro_monthly,
  business: STRIPE_PRICES.business_monthly,
}

// ============================================================
// Helper : construire l'URL de l'app (Render en prod, localhost en dev)
// ============================================================
export function getAppUrl(request?: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (request) {
    const url = new URL(request.url)
    return `${url.protocol}//${url.host}`
  }
  return 'http://localhost:10000'
}
