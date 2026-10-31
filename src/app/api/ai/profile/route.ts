import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { generateChat } from '@/lib/ai-providers'

// POST /api/ai/profile - Analyse de profil LinkedIn
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { headline, about } = await request.json()

    const result = await generateChat({
      system: "Tu es un expert en optimisation de profil LinkedIn. Analyse le profil fourni et donne des recommandations concrètes pour l'améliorer. Format : points numérotés. Réponds en français.",
      user: `Analyse mon profil LinkedIn:\n\nTitre: ${headline}\nÀ propos: ${about}\n\nDonne-moi 5 recommandations pour améliorer mon profil et attirer plus de prospects.`,
      temperature: 0.5,
      maxTokens: 1000,
    })

    return NextResponse.json({ success: true, data: { content: result.content } })
  } catch (error: any) {
    console.error('[POST /api/ai/profile]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
