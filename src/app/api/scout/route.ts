import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { generateChat } from '@/lib/ai-providers'
import { db } from '@/lib/db'

// ============================================================
// POST /api/scout
// Mission Scout : analyse les tendances LinkedIn et suggère
// des opportunités de contenu + prospects à cibler
//
// Body: { focus?: string } (ex: "IA", "marketing B2B")
// ============================================================

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const focus = body.focus || 'général'

    // Récupérer les settings pour contextualiser
    const settings = await db.smartPosterSettings.findUnique({
      where: { userId },
      select: { topics: true, targetAudience: true, tone: true },
    })

    const topics = settings?.topics || 'IA, marketing digital, tech'
    const audience = settings?.targetAudience || 'entrepreneurs, CTO'

    const result = await generateChat({
      system: `Tu es Mission Scout, un expert en veille LinkedIn B2B. Tu analyses les tendances et opportunités de contenu.

Tu réponds UNIQUEMENT en JSON valide, sans markdown :
{
  "trends": [
    {
      "topic": "nom de la tendance",
      "why": "pourquoi c'est pertinent maintenant",
      "angle": "angle éditorial suggéré",
      "urgency": "high|medium|low",
      "postIdea": "idée de post concret"
    }
  ],
  "opportunities": [
    {
      "type": "type d'opportunité (ex: question fréquente, débat, gap concurrentiel)",
      "description": "description de l'opportunité",
      "action": "action recommandée",
      "timing": "quand agir"
    }
  ],
  "contentGaps": [
    {
      "gap": "sujet non couvert par la concurrence",
      "suggestion": "comment le couvrir",
      "potential": "high|medium|low"
    }
  ],
  "hotTopics": ["sujet1", "sujet2", "sujet3"]
}

Sois spécifique, concret, et adapté aux sujets de l'utilisateur.`,
      user: `Analyse les opportunités LinkedIn pour :
- Sujets : ${topics}
- Audience cible : ${audience}
- Focus particulier : ${focus}

Génère 5 tendances, 3 opportunités, 3 content gaps, et 5 hot topics.`,
      temperature: 0.8,
      maxTokens: 2000,
    })

    // Parser le JSON
    let parsed
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        parsed = { raw: result.content }
      }
    } catch {
      parsed = { raw: result.content }
    }

    return NextResponse.json({
      success: true,
      data: parsed,
      provider: result.provider,
    })
  } catch (error: any) {
    console.error('[POST /api/scout]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
