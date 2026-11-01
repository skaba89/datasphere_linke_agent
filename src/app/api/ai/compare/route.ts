import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { compareProviders } from '@/lib/ai-providers'
import { db } from '@/lib/db'

// ============================================================
// POST /api/ai/compare
// Multi-IA Comparison Studio
//
// Lance un même prompt sur tous les providers IA configurés
// et retourne chaque réponse + latence + erreur éventuelle.
// Body: { prompt: string, system?: string, temperature?, maxTokens? }
// ============================================================

const DEFAULT_SYSTEM = `Tu es un expert LinkedIn B2B. Réponds en français, de manière concise et actionnable.`

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { prompt, system, temperature, maxTokens } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
      return NextResponse.json({ success: false, error: 'Prompt trop court (5 caractères min.)' }, { status: 400 })
    }
    if (prompt.length > 4000) {
      return NextResponse.json({ success: false, error: 'Prompt trop long (4000 caractères max.)' }, { status: 400 })
    }

    // Plan gating: comparison is reserved for paid plans
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true, role: true },
    })
    const plan = (user?.plan || 'free').toLowerCase()
    const isAdmin = user?.role === 'admin'
    if (!isAdmin && plan !== 'pro' && plan !== 'business' && plan !== 'agency') {
      return NextResponse.json(
        { success: false, error: 'Multi-IA Comparison est réservé aux plans Pro et supérieurs.' },
        { status: 403 }
      )
    }

    const results = await compareProviders({
      system: system || DEFAULT_SYSTEM,
      user: prompt,
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      maxTokens: typeof maxTokens === 'number' ? Math.min(maxTokens, 1500) : 800,
    })

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        prompt: prompt.slice(0, 200),
        timestamp: new Date().toISOString(),
        providersCount: results.length,
      },
    })
  } catch (error: any) {
    console.error('[POST /api/ai/compare]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
