import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { generateChat } from '@/lib/ai-providers'

// POST /api/ai/chat - Chat avec l'Agent IA
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { message } = await request.json()
    if (!message) return NextResponse.json({ success: false, error: 'Message requis' }, { status: 400 })

    const result = await generateChat({
      system: "Tu es un expert LinkedIn B2B. Tu aides l'utilisateur à créer du contenu, optimiser son profil, et développer sa stratégie LinkedIn. Réponds en français, de manière concise et actionnable.",
      user: message,
      temperature: 0.7,
      maxTokens: 1000,
    })

    return NextResponse.json({ success: true, data: { content: result.content, provider: result.provider } })
  } catch (error: any) {
    console.error('[POST /api/ai/chat]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
