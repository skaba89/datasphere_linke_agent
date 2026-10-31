import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import {
  generateTwoFactorSecret,
  generateOtpAuthUri,
  generateQrCodeDataUrl,
  verifyTwoFactorToken,
  generateBackupCodes,
  hashBackupCodes,
} from '@/lib/two-factor'

// ============================================================
// POST /api/2fa/setup
// Initialise le 2FA : génère secret + QR code + backup codes
// Body: { token: string } (vérifie que le user peut générer un code valide)
//
// Étapes frontend :
//   1. POST /api/2fa/setup (sans token) → reçoit QR + secret provisoire
//   2. User scanne QR avec son app, génère un code
//   3. POST /api/2fa/setup avec { token, secret } → confirme et active
// ============================================================

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'User introuvable' }, { status: 404 })
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { success: false, error: '2FA déjà activé. Désactivez-le d\'abord.' },
        { status: 400 }
      )
    }

    // Phase 1 : générer secret + QR
    if (!body.token || !body.secret) {
      const secret = generateTwoFactorSecret(user.email)
      const otpauthUri = generateOtpAuthUri(user.email, secret)
      const qrCodeDataUrl = await generateQrCodeDataUrl(otpauthUri)

      return NextResponse.json({
        success: true,
        data: {
          secret, // ⚠️ À renvoyer en phase 2 pour confirmer
          otpauthUri,
          qrCode: qrCodeDataUrl,
          message: 'Scannez ce QR code avec votre app (Google Authenticator, Authy, etc.) puis entrez le code à 6 chiffres.',
        },
      })
    }

    // Phase 2 : vérifier le token et activer
    const { token, secret } = body
    const isValid = await verifyTwoFactorToken(token, secret)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Code TOTP invalide. Réessayez.' },
        { status: 400 }
      )
    }

    // Générer les codes de secours
    const backupCodes = generateBackupCodes()
    const hashedBackupCodes = await hashBackupCodes(backupCodes)

    // Activer le 2FA
    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedBackupCodes,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        backupCodes, // ⚠️ Affichés UNE SEULE fois
        message: '2FA activé. Sauvegardez vos codes de secours, ils ne seront plus affichés.',
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/2fa/setup]', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
