import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSessionCookie } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Protection anti-brute-force basique (in-memory, par IP)
// Pour une vraie prod, utiliser Upstash Redis
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 min

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const entry = loginAttempts.get(ip)

  if (!entry || now - entry.lastAttempt > WINDOW_MS) {
    return { allowed: true }
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - entry.lastAttempt)) / 1000)
    return { allowed: false, retryAfterSec }
  }

  return { allowed: true }
}

function recordFailedAttempt(ip: string) {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || now - entry.lastAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now })
  } else {
    entry.count += 1
    entry.lastAttempt = now
  }
}

function clearAttempts(ip: string) {
  loginAttempts.delete(ip)
}

export async function POST(request: Request) {
  try {
    // Rate limiting par IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = checkRateLimit(ip)
    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Trop de tentatives. Réessayez dans ${rl.retryAfterSec}s`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rl.retryAfterSec || 60) },
        }
      )
    }

    const { email, password } = await request.json()
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

    const normalizedEmail = email.toLowerCase().trim()
    const user = await db.user.findUnique({ where: { email: normalizedEmail } })

    // ✅ Toujours répondre le même message pour éviter l'énumération d'users
    const INVALID = 'Identifiants invalides'

    if (!user || !user.passwordHash) {
      recordFailedAttempt(ip)
      return NextResponse.json(
        { success: false, error: INVALID },
        { status: 401 }
      )
    }

    // ✅ bcrypt compare (resistant au timing attack)
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      recordFailedAttempt(ip)
      return NextResponse.json(
        { success: false, error: INVALID },
        { status: 401 }
      )
    }

    clearAttempts(ip)
    await setSessionCookie(user.id)

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt,
      },
    })
  } catch (error: any) {
    console.error('[POST /api/auth/login]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
