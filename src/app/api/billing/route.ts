import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { PLAN_LIMITS, isUserInTrial } from '@/lib/plans'

// ============================================================
// GET /api/billing
// Retourne le statut d'abonnement de l'utilisateur courant
// (plan, trial, limites, URLs Stripe)
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

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        trialEndsAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripeSubscriptionStatus: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur introuvable' },
        { status: 404 }
      )
    }

    const trialActive = await isUserInTrial(user.id)
    const effectivePlan = trialActive ? 'pro' : (user.plan as keyof typeof PLAN_LIMITS || 'free')
    const limits = PLAN_LIMITS[effectivePlan]

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          effectivePlan,
          trialActive,
          trialEndsAt: user.trialEndsAt,
          hasSubscription: !!user.stripeSubscriptionId,
          subscriptionStatus: user.stripeSubscriptionStatus,
        },
        limits: {
          postsPerDay: limits.postsPerDay === Infinity ? null : limits.postsPerDay,
          linkedinAccounts: limits.linkedinAccounts === Infinity ? null : limits.linkedinAccounts,
          analyticsDays: limits.analyticsDays,
          aiGeneration: limits.aiGeneration,
          price: limits.price,
        },
        // Le portal Stripe n'est dispo que si customer existe
        canManageBilling: !!user.stripeCustomerId,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/billing]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
