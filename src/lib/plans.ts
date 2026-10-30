import { db } from '@/lib/db'

// ============================================================
// Plans & Limites DataSphere
//
// Free     : 3 posts/jour, 1 compte LinkedIn, 14j analytics
// Pro      : 20 posts/jour, 3 comptes LinkedIn, 90j analytics
// Business : illimité, illimité, full analytics
// ============================================================

export const PLAN_LIMITS = {
  free: {
    postsPerDay: 3,
    linkedinAccounts: 1,
    analyticsDays: 14,
    aiGeneration: false, // pas de génération IA en Free
    price: 0,
  },
  pro: {
    postsPerDay: 20,
    linkedinAccounts: 3,
    analyticsDays: 90,
    aiGeneration: true,
    price: 29,
  },
  business: {
    postsPerDay: Infinity,
    linkedinAccounts: Infinity,
    analyticsDays: 365,
    aiGeneration: true,
    price: 79,
  },
} as const

export type PlanName = keyof typeof PLAN_LIMITS
export type LimitKey = 'postsPerDay' | 'linkedinAccounts' | 'analyticsDays' | 'aiGeneration'

export interface LimitCheckResult {
  allowed: boolean
  limit: number | boolean | null
  current: number
  remaining: number | null
}

// ============================================================
// Vérifie si l'utilisateur peut faire l'action
// - 'postsPerDay' : nombre de proposals créés aujourd'hui
// - 'linkedinAccounts' : nombre de comptes LinkedIn actifs
// - 'aiGeneration' : feature gate (booléen)
// ============================================================
export async function checkPlanLimit(
  userId: string,
  limit: 'postsPerDay' | 'linkedinAccounts'
): Promise<LimitCheckResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true, trialEndsAt: true },
  })

  if (!user) {
    return { allowed: false, limit: null, current: 0, remaining: 0 }
  }

  // Pendant le trial, on a accès au plan Pro
  const trialActive = user.trialEndsAt ? new Date(user.trialEndsAt) > new Date() : false
  const effectivePlan: PlanName = trialActive ? 'pro' : (user.plan as PlanName || 'free')
  const limits = PLAN_LIMITS[effectivePlan]

  if (limit === 'postsPerDay') {
    // Compter les proposals créées aujourd'hui (UTC)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const count = await db.postProposal.count({
      where: {
        userId,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    })

    const limitVal = limits.postsPerDay
    return {
      allowed: count < limitVal,
      limit: limitVal,
      current: count,
      remaining: Math.max(0, limitVal - count),
    }
  }

  if (limit === 'linkedinAccounts') {
    const count = await db.linkedInAccount.count({
      where: { userId, status: 'active' },
    })

    const limitVal = limits.linkedinAccounts
    return {
      allowed: count < limitVal,
      limit: limitVal === Infinity ? null : limitVal,
      current: count,
      remaining: limitVal === Infinity ? null : Math.max(0, limitVal - count),
    }
  }

  return { allowed: false, limit: null, current: 0, remaining: 0 }
}

// ============================================================
// Vérifie l'accès à une feature (gate)
// ============================================================
export async function checkPlanFeature(
  userId: string,
  feature: 'aiGeneration' | 'analyticsDays'
): Promise<{ allowed: boolean; value: boolean | number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true, trialEndsAt: true },
  })

  if (!user) {
    return { allowed: false, value: false }
  }

  const trialActive = user.trialEndsAt ? new Date(user.trialEndsAt) > new Date() : false
  const effectivePlan: PlanName = trialActive ? 'pro' : (user.plan as PlanName || 'free')
  const limits = PLAN_LIMITS[effectivePlan]

  if (feature === 'aiGeneration') {
    return { allowed: limits.aiGeneration, value: limits.aiGeneration }
  }

  if (feature === 'analyticsDays') {
    return { allowed: true, value: limits.analyticsDays }
  }

  return { allowed: false, value: false }
}

// ============================================================
// Helper : le user est-il en trial actif ?
// ============================================================
export async function isUserInTrial(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { trialEndsAt: true },
  })
  return user?.trialEndsAt ? new Date(user.trialEndsAt) > new Date() : false
}
