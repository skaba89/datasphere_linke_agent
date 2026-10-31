import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { createApiKey, listUserApiKeys } from '@/lib/api-keys'
import { checkPlanFeature } from '@/lib/plans'

// ============================================================
// GET /api/api-keys
// Liste les clés API de l'utilisateur
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

    const keys = await listUserApiKeys(userId)
    return NextResponse.json({ success: true, data: keys })
  } catch (error: any) {
    console.error('[GET /api/api-keys]', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// ============================================================
// POST /api/api-keys
// Crée une nouvelle clé API (Plan Business requis)
// Body: { name: string }
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

    // ⚠️ Réservé au plan Business
    const featCheck = await checkPlanFeature(userId, 'aiGeneration')
    const user = await import('@/lib/db').then(m => m.db.user.findUnique({
      where: { id: userId },
      select: { plan: true, trialEndsAt: true },
    }))

    const trialActive = user?.trialEndsAt ? new Date(user.trialEndsAt) > new Date() : false
    const effectivePlan = trialActive ? 'pro' : (user?.plan || 'free')

    if (effectivePlan !== 'business') {
      return NextResponse.json(
        {
          success: false,
          error: 'API publique réservée au plan Business. Passez à l\'offre supérieure.',
          upgrade: true,
        },
        { status: 402 }
      )
    }

    const body = await request.json()
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nom requis' },
        { status: 400 }
      )
    }

    const created = await createApiKey(userId, body.name)

    // ⚠️ La clé complète n'est affichée qu'UNE SEULE fois
    return NextResponse.json({
      success: true,
      data: created,
      warning: 'Copiez cette clé maintenant, elle ne sera plus affichée.',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/api-keys]', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
