import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// PUT /api/linkedin/[id]
// Met à jour un compte LinkedIn (réactiver, refresh token, etc.)
// ============================================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Vérifier l'appartenance
    const existing = await db.linkedInAccount.findFirst({
      where: { id, userId },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Compte introuvable' },
        { status: 404 }
      )
    }

    const allowed: Record<string, any> = {}
    const fields = [
      'displayName', 'email', 'pictureUrl', 'headline',
      'accessToken', 'refreshToken', 'tokenExpiresAt',
      'scopes', 'status', 'lastSyncAt',
    ]
    for (const f of fields) {
      if (body[f] !== undefined) {
        allowed[f] =
          f === 'tokenExpiresAt' || f === 'lastSyncAt'
            ? body[f] ? new Date(body[f]) : null
            : body[f]
      }
    }

    const account = await db.linkedInAccount.update({
      where: { id },
      data: allowed,
    })

    const { accessToken: _a, refreshToken: _r, ...safe } = account as any
    return NextResponse.json({ success: true, data: safe })
  } catch (error: any) {
    console.error('[PUT /api/linkedin/[id]]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE /api/linkedin/[id]
// Désactive (soft delete) le compte - garde l'enregistrement
// pour pouvoir le réactiver via POST (upsert) ultérieurement
// ============================================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { id } = await params

    const existing = await db.linkedInAccount.findFirst({
      where: { id, userId },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Compte introuvable' },
        { status: 404 }
      )
    }

    // Soft delete : status=disabled + on garde l'enregistrement
    // pour permettre la réactivation via POST upsert
    await db.linkedInAccount.update({
      where: { id },
      data: {
        status: 'disabled',
        accessToken: '', // Invalide le token côté DB
        refreshToken: null,
        lastSyncAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/linkedin/[id]]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
