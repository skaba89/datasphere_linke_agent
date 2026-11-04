import { NextResponse } from 'next/server'
import { generateChat, getAvailableProviders } from '@/lib/ai-providers'

// ============================================================
// POST /api/ai/test
// Test direct de l'IA — SANS AUTH pour debug production
//
// Body: { prompt?: string }
// Si pas de body, utilise un prompt par défaut.
//
// Retourne:
//   - success: true/false
//   - content: la réponse de l'IA
//   - provider: quel provider a réussi
//   - providers: liste des providers disponibles
//   - error: message d'erreur si échec
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const prompt = body.prompt || "Dis Bonjour, l'IA fonctionne ! en une phrase."

    const providers = getAvailableProviders()

    if (providers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Aucun provider IA configuré',
        providers: [],
        envCheck: {
          GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
          GLM_API_KEY: !!process.env.GLM_API_KEY,
          ZAI_API_KEY: !!process.env.ZAI_API_KEY,
          GROQ_API_KEY: !!process.env.GROQ_API_KEY,
          OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
        },
      }, { status: 500 })
    }

    const result = await generateChat({
      system: 'Tu es un assistant. Réponds brièvement en français.',
      user: prompt,
      temperature: 0.7,
      maxTokens: 100,
    })

    return NextResponse.json({
      success: true,
      content: result.content,
      provider: result.provider,
      providers,
    })
  } catch (error: any) {
    console.error('[POST /api/ai/test]', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      providers: getAvailableProviders(),
      envCheck: {
        GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
        GLM_API_KEY: !!process.env.GLM_API_KEY,
        ZAI_API_KEY: !!process.env.ZAI_API_KEY,
        GROQ_API_KEY: !!process.env.GROQ_API_KEY,
        OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
      },
    }, { status: 500 })
  }
}

// GET version pour test facile via navigateur
export async function GET() {
  try {
    const providers = getAvailableProviders()

    if (providers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Aucun provider IA configuré. Ajoutez au moins une clé API sur Render.',
        providers: [],
        envCheck: {
          GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
          GLM_API_KEY: !!process.env.GLM_API_KEY,
          ZAI_API_KEY: !!process.env.ZAI_API_KEY,
          GROQ_API_KEY: !!process.env.GROQ_API_KEY,
          OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
        },
        help: 'Configurez une de ces variables sur Render: GEMINI_API_KEY, GLM_API_KEY, ZAI_API_KEY, GROQ_API_KEY',
        links: {
          gemini: 'https://aistudio.google.com/apikey',
          glm: 'https://open.bigmodel.cn/usercenter/apikeys',
          groq: 'https://console.groq.com/keys',
        },
      }, { status: 500 })
    }

    // Test réel avec un prompt simple
    const result = await generateChat({
      system: 'Tu es un assistant. Réponds brièvement.',
      user: 'Dis "Bonjour" en un mot.',
      temperature: 0.7,
      maxTokens: 20,
    })

    return NextResponse.json({
      success: true,
      content: result.content,
      provider: result.provider,
      providers,
      message: "✅ L'IA fonctionne ! Provider: " + result.provider,
    })
  } catch (error: any) {
    console.error('[GET /api/ai/test]', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      providers: getAvailableProviders(),
      envCheck: {
        GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
        GLM_API_KEY: !!process.env.GLM_API_KEY,
        ZAI_API_KEY: !!process.env.ZAI_API_KEY,
        GROQ_API_KEY: !!process.env.GROQ_API_KEY,
        OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
      },
      help: "L'IA a échoué. Vérifiez que les clés API sont valides sur Render.",
    }, { status: 500 })
  }
}
