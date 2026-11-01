import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { generateChat } from '@/lib/ai-providers'

// ============================================================
// POST /api/content-quality
// Content Quality Studio
//
// Analyse un post LinkedIn et donne un score + suggestions
// Body: { content: string }
// ============================================================

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { content } = await request.json()
    if (!content || content.trim().length < 10) {
      return NextResponse.json({ success: false, error: 'Contenu trop court (10 caractères min.)' }, { status: 400 })
    }

    const result = await generateChat({
      system: `Tu es un expert en optimisation de contenu LinkedIn. Tu analyses un post et donnes un score de qualité + des suggestions d'amélioration.

Réponds UNIQUEMENT en JSON valide :
{
  "score": {
    "overall": 0-10,
    "hook": 0-10,
    "structure": 0-10,
    "readability": 0-10,
    "cta": 0-10,
    "hashtag": 0-10
  },
  "analysis": {
    "hook": "analyse de la première ligne",
    "structure": "analyse de la structure",
    "readability": "analyse de la lisibilité",
    "cta": "analyse de l'appel à l'action",
    "length": "analyse de la longueur (idéal: 800-1500 chars)",
    "hashtag": "analyse des hashtags"
  },
  "suggestions": [
    "suggestion 1",
    "suggestion 2",
    "suggestion 3"
  ],
  "revisedVersion": "version améliorée du post",
  "abVariant": "une variante A/B avec un angle différent"
}`,
      user: `Analyse ce post LinkedIn:

${content}

Donne le score de qualité complet + les suggestions + une version révisée + une variante A/B.`,
      temperature: 0.5,
      maxTokens: 2000,
    })

    let parsed
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
      else parsed = { raw: result.content }
    } catch { parsed = { raw: result.content } }

    return NextResponse.json({ success: true, data: parsed, provider: result.provider })
  } catch (error: any) {
    console.error('[POST /api/content-quality]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
