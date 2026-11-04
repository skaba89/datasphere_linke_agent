import { NextResponse } from 'next/server'

// ============================================================
// GET /api/ai/models
// Liste les modèles disponibles sur l'API Z.ai/GLM
// SANS AUTH — pour diagnostic production
//
// Teste 12 modèles × 2 endpoints = 24 appels
// Retourne quels modèles fonctionnent réellement.
// ============================================================

export async function GET() {
  const apiKey = process.env.GLM_API_KEY || process.env.ZAI_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: 'GLM_API_KEY (ou ZAI_API_KEY) non configuré',
      envCheck: {
        GLM_API_KEY: !!process.env.GLM_API_KEY,
        ZAI_API_KEY: !!process.env.ZAI_API_KEY,
        GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
        GROQ_API_KEY: !!process.env.GROQ_API_KEY,
        OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
      },
    }, { status: 500 })
  }

  const endpoints = [
    { name: 'open.bigmodel.cn', url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions' },
    { name: 'api.z.ai', url: 'https://api.z.ai/api/paas/v4/chat/completions' },
  ]

  const testModels = [
    'glm-4', 'glm-4-plus', 'glm-4-air', 'glm-4-airx',
    'glm-4-long', 'glm-4-flashx', 'glm-4-0520',
    'glm-4-flash-250424', 'glm-4v', 'glm-4v-flash',
    'glm-3-turbo', 'chatglm_turbo',
  ]

  const testResults: any[] = []

  for (const model of testModels) {
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 5,
          }),
        })

        if (res.ok) {
          testResults.push({ model, endpoint: ep.name, ok: true, status: 200 })
          break // OK — passer au modèle suivant
        } else {
          const body = await res.text()
          testResults.push({
            model, endpoint: ep.name, ok: false,
            status: res.status,
            error: body.slice(0, 150),
          })
        }
      } catch (err: any) {
        testResults.push({
          model, endpoint: ep.name, ok: false,
          status: 0, error: err.message,
        })
      }
    }
  }

  const workingModels = testResults.filter(r => r.ok)

  return NextResponse.json({
    success: workingModels.length > 0,
    workingModels: workingModels.map(r => ({ model: r.model, endpoint: r.endpoint })),
    allTests: testResults,
    apiKeyPrefix: apiKey.slice(0, 8) + '...' + apiKey.slice(-4),
    recommendation: workingModels.length > 0
      ? `Définissez GLM_MODEL=${workingModels[0].model} sur Render. Ce modèle fonctionne sur ${workingModels[0].endpoint}.`
      : 'Aucun modèle ne fonctionne. Vérifiez que la clé API est valide sur https://open.bigmodel.cn/usercenter/apikeys',
  })
}
