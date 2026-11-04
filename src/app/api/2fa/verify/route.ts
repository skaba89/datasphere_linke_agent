import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId, setSessionCookie } from '@/lib/auth'
import { verifyTwoFactorToken, verifyBackupCode } from '@/lib/two-factor'
import { consume2FAPendingToken } from '@/lib/two-factor-pending'

// ============================================================
// POST /api/2fa/verify
// Vérifie un code TOTP (ou code de secours) pour login
//
// Body: { token: string, twoFactorToken?: string }
//
// Deux modes:
//   1. Login 2FA: { token, twoFactorToken } — le twoFactorToken est
//      obtenu depuis /api/auth/login quand 2FA est activé.
//      → Vérifie le TOTP, puis set session cookie.
//   2. Session active: { token } (avec cookie session valide)
//      → Vérifie le TOTP pour l'user courant (pas de cookie set).
// ============================================================

export async function POST(request: Request) {
  try {
    const { token, twoFactorToken } = await request.json()

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token 2FA requis' }, { status: 400 })
    }

    let userId: string | null = null
    let isLoginFlow = false

    // Mode 1: Login 2FA — verify the pending token (P0 FIX: no more bodyUserId)
    if (twoFactorToken) {
      userId = consume2FAPendingToken(twoFactorToken)
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Token 2FA expiré ou invalide. Reconnectez-vous.' }, { status: 401 })
      }
      isLoginFlow = true
    } else {
      // Mode 2: Session active — verify for current user
      userId = await getCurrentUserId()
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
      }
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, plan: true, trialEndsAt: true,
        twoFactorSecret: true, twoFactorEnabled: true, twoFactorBackupCodes: true,
      },
    })

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ success: false, error: '2FA non activé' }, { status: 400 })
    }

    // 1. Vérifier le token TOTP
    const totpValid = await verifyTwoFactorToken(token, user.twoFactorSecret)
    if (totpValid) {
      if (isLoginFlow) {
        await setSessionCookie(user.id)
        return NextResponse.json({
          success: true, method: 'totp',
          data: { id: user.id, email: user.email, name: user.name, plan: user.plan, trialEndsAt: user.trialEndsAt },
        })
      }
      return NextResponse.json({ success: true, method: 'totp' })
    }

    // 2. Sinon, vérifier les codes de secours
    if (user.twoFactorBackupCodes) {
      const [valid, newHashedCodes] = await verifyBackupCode(token, user.twoFactorBackupCodes)
      if (valid && newHashedCodes !== null) {
        await db.user.update({ where: { id: user.id }, data: { twoFactorBackupCodes: newHashedCodes } })
        if (isLoginFlow) {
          await setSessionCookie(user.id)
          return NextResponse.json({
            success: true, method: 'backup',
            data: { id: user.id, email: user.email, name: user.name, plan: user.plan, trialEndsAt: user.trialEndsAt },
          })
        }
        return NextResponse.json({ success: true, method: 'backup' })
      }
    }

    return NextResponse.json({ success: false, error: 'Code 2FA invalide' }, { status: 401 })
  } catch (error: any) {
    console.error('[POST /api/2fa/verify]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
