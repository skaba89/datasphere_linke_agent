import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSessionCookie } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'
import { applyRateLimit, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit'
import { processReferralOnSignup, ensureReferralCode } from '@/lib/affiliate'
import bcrypt from 'bcryptjs'

// Validation email RFC simple
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    // Rate limiting : 3 inscriptions / heure / IP
    const rl = applyRateLimit(request, 'register', RATE_LIMITS.register)
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Trop de tentatives. Réessayez plus tard.' },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders(rl),
            'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }
    const { email, password, name, referralCode } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Email invalide' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Mot de passe trop court (8 caractères min.)' },
        { status: 400 }
      )
    }

    if (password.length > 128) {
      return NextResponse.json(
        { success: false, error: 'Mot de passe trop long (128 caractères max.)' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Cet email est déjà utilisé' },
        { status: 409 }
      )
    }

    // ✅ bcrypt avec cost factor 12 (sécurisé, ~250ms par hash)
    const passwordHash = await bcrypt.hash(password, 12)

    // Trial 14 jours
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: name?.trim() || null,
        passwordHash,
        plan: 'pro',
        trialEndsAt,
      },
    })

    await setSessionCookie(user.id)

    // ✅ Génère un code de parrainage pour ce nouvel user
    ensureReferralCode(user.id, user.name).catch(() => {})

    // ✅ Traite le referral code si fourni (lien d'affiliation)
    if (referralCode && typeof referralCode === 'string') {
      processReferralOnSignup(user.id, referralCode.toUpperCase().trim()).catch((err) =>
        console.warn('[Register] Affiliate referral failed:', err.message)
      )
    }

    // ✅ Email de bienvenue (async, ne bloque pas la réponse)
    sendWelcomeEmail(user.email, user.name).catch((err) =>
      console.warn('[Register] Welcome email failed:', err.message)
    )

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt,
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/auth/register]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
