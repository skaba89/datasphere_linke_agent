import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { verifyTwoFactorToken } from '@/lib/two-factor'

// ============================================================
// POST /api/2fa/disable
// Désactive le 2FA (vérifie le token courant avant)
// Body: { token: string }
// ============================================================
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { token } = await request.json()
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requis' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    })

    if (!user || !user.twoFactorEnabled) {
      return NextResponse.json({ success: false, error: '2FA non activé' }, { status: 400 })
    }

    const valid = await verifyTwoFactorToken(token, user.twoFactorSecret!)
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Code invalide. 2FA non désactivé.' },
        { status: 401 }
      )
    }

    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: false,
        twoFactorBackupCodes: null,
      },
    })

    return NextResponse.json({ success: true, message: '2FA désactivé' })
  } catch (error: any) {
    console.error('[POST /api/2fa/disable]', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
