import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { verifyTwoFactorToken, verifyBackupCode } from '@/lib/two-factor'

// ============================================================
// POST /api/2fa/verify
// Vérifie un code TOTP (ou code de secours) pour login
// Body: { token: string, userId: string }
// Utilisé par le middleware de login quand le user a 2FA enabled
// ============================================================
export async function POST(request: Request) {
  try {
    const { token, userId: bodyUserId } = await request.json()

    // Si bodyUserId fourni : c'est un login (vérifier pour ce user)
    // Sinon : c'est une vérification de session courante
    const currentUserId = await getCurrentUserId()
    const userId = bodyUserId || currentUserId

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true, twoFactorBackupCodes: true },
    })

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ success: false, error: '2FA non activé' }, { status: 400 })
    }

    // 1. Vérifier le token TOTP
    const totpValid = await verifyTwoFactorToken(token, user.twoFactorSecret)
    if (totpValid) {
      return NextResponse.json({ success: true, method: 'totp' })
    }

    // 2. Sinon, vérifier les codes de secours
    if (user.twoFactorBackupCodes) {
      const [valid, newHashedCodes] = await verifyBackupCode(token, user.twoFactorBackupCodes)
      if (valid && newHashedCodes !== null) {
        // Mettre à jour la liste des codes (supprimer celui utilisé)
        await db.user.update({
          where: { id: userId },
          data: { twoFactorBackupCodes: newHashedCodes },
        })
        return NextResponse.json({ success: true, method: 'backup' })
      }
    }

    return NextResponse.json(
      { success: false, error: 'Code invalide' },
      { status: 401 }
    )
  } catch (error: any) {
    console.error('[POST /api/2fa/verify]', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
