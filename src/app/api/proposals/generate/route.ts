import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { generateLinkedInPosts } from '@/lib/ai'
import { checkPlanLimit, checkPlanFeature } from '@/lib/plans'
import { applyRateLimit, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit'

// ============================================================
// POST /api/proposals/generate
// Génère de nouveaux posts LinkedIn via LLM
//
// Body optionnel: { count?: number }
// Utilise les settings de l'utilisateur (topics, tone, audience, language)
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

    // ⭐ Vérifier que le plan permet la génération IA (Free = non)
    const featCheck = await checkPlanFeature(userId, 'aiGeneration')
    if (!featCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'La génération IA nécessite le plan Pro ou Business. Passez à l\'offre supérieure.',
          upgrade: true,
        },
        { status: 402 }
      )
    }

    // Rate limiting IA : 10 générations / heure / user
    const rl = applyRateLimit(request, 'ai-generate', RATE_LIMITS.aiGenerate, userId)
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: `Trop de générations. Réessayez dans ${Math.ceil((rl.resetAt - Date.now()) / 60000)} min.` },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders(rl),
            'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    // Vérifier les limites du plan (posts/jour)
    const limitCheck = await checkPlanLimit(userId, 'postsPerDay')
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Limite de votre plan atteinte (${limitCheck.limit} posts/jour). Passez à l'offre supérieure.`,
          upgrade: true,
        },
        { status: 402 }
      )
    }

    // Récupérer les settings pour le prompt
    let settings = await db.smartPosterSettings.findUnique({ where: { userId } })
    if (!settings) {
      // Créer avec les valeurs par défaut
      settings = await db.smartPosterSettings.create({
        data: {
          userId,
          topics: 'IA, tech, marketing digital',
          tone: 'Professionnel mais accessible',
          targetAudience: 'entrepreneurs, CTO',
          language: 'fr',
        },
      })
    }

    const body = await request.json().catch(() => ({}))
    const count = Math.min(body.count || 3, 10) // max 10 par requête

    // ✅ Vraie génération IA
    const posts = await generateLinkedInPosts({
      topics: settings.topics,
      tone: settings.tone,
      targetAudience: settings.targetAudience,
      language: settings.language,
      count,
    })

    // Persister en base
    const created: Awaited<ReturnType<typeof db.postProposal.create>>[] = []
    for (const p of posts) {
      const proposal = await db.postProposal.create({
        data: { ...p, userId, status: 'pending' },
      })
      created.push(proposal)
    }

    return NextResponse.json({
      success: true,
      data: created,
      count: created.length,
      generatedBy: 'llm',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/proposals/generate]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur lors de la génération IA' },
      { status: 500 }
    )
  }
}

