import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// PUT /api/linkedin/active
// Marque un compte LinkedIn comme "actif" (les autres passent
// en "disabled" pour qu'au max 1 seul soit actif par user).
//
// En réalité, on garde tous les comptes "active" mais on introduit
// un flag "primary" via les metadatas du user. Plus simple : on
// désactive les autres et on active seulement celui sélectionné.
//
// Body: { accountId: string }
// ============================================================
export async function PUT(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { accountId } = await request.json()
    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'accountId requis' },
        { status: 400 }
      )
    }

    // Vérifier que le compte appartient à l'user
    const account = await db.linkedInAccount.findFirst({
      where: { id: accountId, userId },
    })
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Compte introuvable' },
        { status: 404 }
      )
    }

    // Désactiver tous les autres comptes LinkedIn de l'user
    await db.linkedInAccount.updateMany({
      where: { userId, NOT: { id: accountId } },
      data: { status: 'disabled' },
    })

    // Réactiver le compte sélectionné
    await db.linkedInAccount.update({
      where: { id: accountId },
      data: { status: 'active', lastSyncAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      data: { activeAccountId: accountId },
    })
  } catch (error: any) {
    console.error('[PUT /api/linkedin/active]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
