import { db } from '@/lib/db'
import { randomBytes } from 'crypto'

// ============================================================
// Affiliate Service - Programme de parrainage
//
// - 20% de commission sur le MRR du user référé (à vie)
// - Payouts mensuels via Stripe Connect (quand >50€)
// - Conversion automatique quand le referred passe en payant
// ============================================================

export const COMMISSION_RATE = 0.20 // 20%
export const MIN_PAYOUT_AMOUNT = 5000 // 50€ en centimes

// ============================================================
// Génère un code de parrainage unique (8 chars)
// ============================================================
export function generateReferralCode(name?: string | null): string {
  const base = (name || 'ds')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 4)
  const random = randomBytes(3).toString('hex').toUpperCase()
  return `${base || 'ds'}${random}` // ex: "marieAB12CD"
}

// ============================================================
// Assigne un code de parrainage à un user (si pas déjà fait)
// ============================================================
export async function ensureReferralCode(userId: string, name?: string | null): Promise<string> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { referralCode: true, name: true } })
  if (user?.referralCode) return user.referralCode

  let code = generateReferralCode(name || user?.name)
  // Vérifier l'unicité (collision rare mais possible)
  let attempts = 0
  while (attempts < 5) {
    const existing = await db.user.findUnique({ where: { referralCode: code } })
    if (!existing) break
    code = generateReferralCode(name)
    attempts++
  }

  await db.user.update({ where: { id: userId }, data: { referralCode: code } })
  return code
}

// ============================================================
// Traite un referral à l'inscription
// - Vérifie le code, lie le nouveau user au referrer
// ============================================================
export async function processReferralOnSignup(referredUserId: string, referralCode: string): Promise<boolean> {
  if (!referralCode) return false

  const referrer = await db.user.findUnique({
    where: { referralCode: referralCode.toUpperCase() },
  })
  if (!referrer || referrer.id === referredUserId) return false

  // Vérifier que le referred n'est pas déjà référé
  const referred = await db.user.findUnique({
    where: { id: referredUserId },
    select: { referredById: true },
  })
  if (referred?.referredById) return false

  // Lier + créer le Referral (status=pending)
  await db.$transaction([
    db.user.update({
      where: { id: referredUserId },
      data: { referredById: referrer.id },
    }),
    db.referral.create({
      data: {
        referrerId: referrer.id,
        referredId: referredUserId,
        referralCode: referralCode.toUpperCase(),
        status: 'pending',
      },
    }),
  ])

  return true
}

// ============================================================
// Convertit un referral quand le referred passe en payant
// Appelé par le webhook Stripe checkout.session.completed
// ============================================================
export async function convertReferral(referredUserId: string, planAmount: number): Promise<void> {
  const referral = await db.referral.findUnique({
    where: { referredId: referredUserId },
  })
  if (!referral || referral.status !== 'pending') return

  const commission = Math.round(planAmount * COMMISSION_RATE)

  await db.referral.update({
    where: { id: referral.id },
    data: {
      status: 'converted',
      convertedAt: new Date(),
      commissionAmount: commission,
    },
  })
}

// ============================================================
// Récupère les stats d'affiliation d'un user
// ============================================================
export async function getAffiliateStats(userId: string) {
  const [referrals, payouts, user] = await Promise.all([
    db.referral.findMany({
      where: { referrerId: userId },
      include: {
        referred: {
          select: { id: true, email: true, name: true, plan: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.payout.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    }),
  ])

  const totalReferrals = referrals.length
  const convertedReferrals = referrals.filter((r) => r.status === 'converted' || r.status === 'paid').length
  const pendingCommission = referrals
    .filter((r) => r.status === 'converted')
    .reduce((acc, r) => acc + r.commissionAmount, 0)
  const paidCommission = payouts.reduce((acc, p) => acc + p.amount, 0)

  return {
    referralCode: user?.referralCode,
    totalReferrals,
    convertedReferrals,
    pendingCommission, // en centimes
    paidCommission,    // en centimes
    referrals: referrals.map((r) => ({
      id: r.id,
      status: r.status,
      commissionAmount: r.commissionAmount,
      convertedAt: r.convertedAt,
      createdAt: r.createdAt,
      referred: r.referred ? {
        email: r.referred.email.replace(/(.{2}).*(@.*)/, '$1***$2'), // partiellement masqué
        plan: r.referred.plan,
      } : null,
    })),
    payouts: payouts.map((p) => ({
      id: p.id,
      amount: p.amount,
      period: p.period,
      status: p.status,
      paidAt: p.paidAt,
    })),
  }
}

// ============================================================
// Calcule les payouts mensuels pour tous les affiliates
// Appelé par un cron le 1er du mois
// ============================================================
export async function calculateMonthlyPayouts(): Promise<{ usersPaid: number; totalAmount: number }> {
  const now = new Date()
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Récupérer tous les referrals converted non payés
  const convertedReferrals = await db.referral.findMany({
    where: { status: 'converted', payoutId: null },
    include: { referrer: { select: { id: true } } },
  })

  // Grouper par referrer
  const byUser = new Map<string, number>()
  for (const r of convertedReferrals) {
    const current = byUser.get(r.referrerId) || 0
    byUser.set(r.referrerId, current + r.commissionAmount)
  }

  let usersPaid = 0
  let totalAmount = 0

  for (const [userId, amount] of byUser.entries()) {
    if (amount < MIN_PAYOUT_AMOUNT) continue // < 50€, on reporte

    // Créer ou récupérer le payout du mois
    const existingPayout = await db.payout.findUnique({
      where: { userId_period: { userId, period } },
    })

    if (existingPayout) continue // déjà créé

    const payout = await db.payout.create({
      data: { userId, amount, period, status: 'pending' },
    })

    // Lier les referrals au payout
    await db.referral.updateMany({
      where: { referrerId: userId, status: 'converted', payoutId: null },
      data: { payoutId: payout.id, status: 'paid', paidAt: new Date() },
    })

    usersPaid++
    totalAmount += amount
  }

  return { usersPaid, totalAmount }
}
