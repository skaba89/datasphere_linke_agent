import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// GET /api/linkedin
// Liste tous les comptes LinkedIn de l'utilisateur courant
// ============================================================
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const accounts = await db.linkedInAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      // ⚠️ Ne jamais exposer le accessToken / refreshToken côté client
      select: {
        id: true,
        userId: true,
        organizationId: true,
        displayName: true,
        email: true,
        pictureUrl: true,
        headline: true,
        status: true,
        scopes: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: accounts })
  } catch (error: any) {
    console.error('[GET /api/linkedin]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST /api/linkedin
// Crée ou réactive un compte LinkedIn.
//
// ⚠️ BUG CORRIGÉ : La contrainte @@unique([userId, organizationId])
// bloque db.linkedInAccount.create() si un compte désactivé existe
// déjà pour ce couple (user, org). On utilise upsert() pour :
//   - créer le compte s'il n'existe pas
//   - réactiver + refresh le token s'il existe (même désactivé)
// ============================================================
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validation minimale
    const required = ['organizationId', 'displayName', 'accessToken']
    for (const f of required) {
      if (!body[f]) {
        return NextResponse.json(
          { success: false, error: `Champ requis manquant: ${f}` },
          { status: 400 }
        )
      }
    }

    const {
      organizationId,
      displayName,
      email,
      pictureUrl,
      headline,
      accessToken,
      refreshToken,
      tokenExpiresAt,
      scopes,
    } = body

    // ✅ SOLUTION : upsert() au lieu de create()
    // - where: @@unique([userId, organizationId])
    // - update: réactive le compte + remplace le token (même si status === 'disabled')
    // - create: crée s'il n'existe pas encore
    const account = await db.linkedInAccount.upsert({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      update: {
        displayName,
        email: email ?? null,
        pictureUrl: pictureUrl ?? null,
        headline: headline ?? null,
        accessToken,
        refreshToken: refreshToken ?? null,
        tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
        scopes: scopes ?? null,
        status: 'active', // ✅ Réactive le compte s'il était désactivé
        lastSyncAt: new Date(),
      },
      create: {
        userId,
        organizationId,
        displayName,
        email: email ?? null,
        pictureUrl: pictureUrl ?? null,
        headline: headline ?? null,
        accessToken,
        refreshToken: refreshToken ?? null,
        tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
        scopes: scopes ?? null,
        status: 'active',
        lastSyncAt: new Date(),
      },
    })

    // Ne pas renvoyer le token au client
    const { accessToken: _omit, refreshToken: _omit2, ...safe } = account as any
    return NextResponse.json({ success: true, data: safe }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/linkedin]', error)

    // Cas où l'utilisateur tente quand même un create ailleurs -> message clair
    if (error?.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Un compte LinkedIn existe déjà pour cet utilisateur/organisation. Utilisez PUT pour le réactiver.',
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
