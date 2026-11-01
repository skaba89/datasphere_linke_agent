// ============================================================
// Multi-AI Provider - Support de plusieurs LLMs
//
// Providers supportés (par ordre de priorité) :
//   1. GEMINI_API_KEY    → Google Gemini (gemini-1.5-flash)
//   2. GLM_API_KEY       → Z.ai GLM (glm-4-flash)
//   3. GROQ_API_KEY      → Groq (llama-3.1-70b-versatile)
//   4. OPENROUTER_API_KEY → OpenRouter (multi-modèles)
//   5. (fallback) z-ai-web-dev-sdk (SDK embarqué)
//
// Usage :
//   import { generateChat } from '@/lib/ai-providers'
//   const reply = await generateChat({ system, user })
// ============================================================

export interface ChatParams {
  system: string
  user: string
  temperature?: number
  maxTokens?: number
}

export interface ChatResult {
  content: string
  provider: string
}

// ============================================================
// Détecter le provider actif (basé sur les env vars disponibles)
// ============================================================
export function getActiveProvider(): string | null {
  if (process.env.GEMINI_API_KEY) return 'gemini'
  if (process.env.GLM_API_KEY) return 'glm'
  if (process.env.GROQ_API_KEY) return 'groq'
  if (process.env.OPENROUTER_API_KEY) return 'openrouter'
  return null // fallback z-ai-web-dev-sdk
}

// ============================================================
// Provider 1 : Google Gemini
// ============================================================

// Cache des modèles disponibles (évite de re-list à chaque appel)
let cachedGeminiModel: string | null = null

async function findAvailableGeminiModel(apiKey: string): Promise<string | null> {
  if (cachedGeminiModel) return cachedGeminiModel

  // 1. D'abord essayer l'API ListModels pour trouver un modèle valide
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    )
    if (listRes.ok) {
      const listData = await listRes.json()
      const models = listData.models || []
      // Chercher un modèle qui supporte generateContent et qui contient "flash" (rapide + gratuit)
      const flashModel = models.find((m: any) =>
        m.supportedGenerationMethods?.includes('generateContent') &&
        m.name?.includes('flash')
      )
      if (flashModel) {
        // Le nom retourné est "models/gemini-X.X-flash" — on garde juste le nom du modèle
        cachedGeminiModel = flashModel.name.replace('models/', '')
        return cachedGeminiModel
      }
      // Sinon prendre le premier qui supporte generateContent
      const anyModel = models.find((m: any) =>
        m.supportedGenerationMethods?.includes('generateContent')
      )
      if (anyModel) {
        cachedGeminiModel = anyModel.name.replace('models/', '')
        return cachedGeminiModel
      }
    }
  } catch {}

  // 2. Fallback : essayer des noms connus manuellement
  const fallbackModels = [
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-pro',
  ]

  for (const model of fallbackModels) {
    try {
      const testRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
        }
      )
      if (testRes.ok) {
        cachedGeminiModel = model
        return model
      }
    } catch {}
  }

  return null
}

async function callGemini(params: ChatParams): Promise<ChatResult> {
  const apiKey = process.env.GEMINI_API_KEY!

  // Trouver un modèle qui marche
  const model = process.env.GEMINI_MODEL || await findAvailableGeminiModel(apiKey)
  if (!model) {
    throw new Error('Aucun modèle Gemini disponible. Vérifiez votre GEMINI_API_KEY.')
  }

  // Essayer v1beta puis v2beta
  for (const apiVersion of ['v1beta', 'v2beta']) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: params.system }] },
          contents: [{ role: 'user', parts: [{ text: params.user }] }],
          generationConfig: {
            temperature: params.temperature ?? 0.7,
            maxOutputTokens: params.maxTokens ?? 2000,
          },
        }),
      }
    )
    if (res.ok) {
      const data = await res.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      return { content, provider: 'gemini' }
    }
    // Si 404 sur v1beta, essayer v2beta
    if (res.status === 404) continue
    // Autre erreur (403, 429, 500) → ne pas réessayer
    const errText = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${errText}`)
  }

  // Si on arrive ici, le modèle n'existe sur aucune version d'API
  // Invalider le cache et réessayer une fois
  cachedGeminiModel = null
  const newModel = await findAvailableGeminiModel(apiKey)
  if (newModel && newModel !== model) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${newModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: params.system }] },
          contents: [{ role: 'user', parts: [{ text: params.user }] }],
          generationConfig: {
            temperature: params.temperature ?? 0.7,
            maxOutputTokens: params.maxTokens ?? 2000,
          },
        }),
      }
    )
    if (res.ok) {
      const data = await res.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      return { content, provider: 'gemini' }
    }
  }

  throw new Error(`Gemini: aucun modèle disponible avec cette clé API`)
}

// ============================================================
// Provider 2 : Z.ai GLM
// ============================================================
async function callGLM(params: ChatParams): Promise<ChatResult> {
  const apiKey = process.env.GLM_API_KEY!
  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 2000,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GLM API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  return { content, provider: 'glm' }
}

// ============================================================
// Provider 3 : Groq (ultra-rapide, Llama 3.1)
// ============================================================
async function callGroq(params: ChatParams): Promise<ChatResult> {
  const apiKey = process.env.GROQ_API_KEY!
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 2000,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  return { content, provider: 'groq' }
}

// ============================================================
// Provider 4 : OpenRouter (multi-modèles)
// ============================================================
async function callOpenRouter(params: ChatParams): Promise<ChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY!
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://datasphere.app',
      'X-Title': 'DataSphere',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-sonnet', // ou 'openai/gpt-4o-mini' pour moins cher
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 2000,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  return { content, provider: 'openrouter' }
}

// ============================================================
// Provider fallback : z-ai-web-dev-sdk
// ============================================================
async function callZAI(params: ChatParams): Promise<ChatResult> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const zai = await ZAI.create()
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: params.system },
      { role: 'user', content: params.user },
    ],
    thinking: { type: 'disabled' },
  })
  const content = completion.choices[0]?.message?.content || ''
  return { content, provider: 'zai-sdk' }
}

// ============================================================
// Fonction principale : génère une réponse chat
// Utilise le 1er provider disponible (ordre de priorité)
// ============================================================
export async function generateChat(params: ChatParams): Promise<ChatResult> {
  const provider = getActiveProvider()

  switch (provider) {
    case 'gemini':
      return await callGemini(params)
    case 'glm':
      return await callGLM(params)
    case 'groq':
      return await callGroq(params)
    case 'openrouter':
      return await callOpenRouter(params)
    default:
      // Fallback : z-ai-web-dev-sdk
      return await callZAI(params)
  }
}

// ============================================================
// Helper : liste les providers disponibles (pour /api/health)
// ============================================================
export function getAvailableProviders(): string[] {
  const providers: string[] = []
  if (process.env.GEMINI_API_KEY) providers.push('gemini')
  if (process.env.GLM_API_KEY) providers.push('glm')
  if (process.env.GROQ_API_KEY) providers.push('groq')
  if (process.env.OPENROUTER_API_KEY) providers.push('openrouter')
  providers.push('zai-sdk') // toujours disponible (fallback)
  return providers
}

// ============================================================
// Compare providers : lance le même prompt sur tous les
// providers configurés et retourne chaque réponse + latence.
// ============================================================
export type ComparisonResult = {
  provider: string
  content: string | null
  latencyMs: number
  error?: string
}

export async function compareProviders(params: ChatParams): Promise<ComparisonResult[]> {
  const tasks: Promise<ComparisonResult>[] = []

  if (process.env.GEMINI_API_KEY) {
    tasks.push(runTimed('gemini', () => callGemini(params)))
  }
  if (process.env.GLM_API_KEY) {
    tasks.push(runTimed('glm', () => callGLM(params)))
  }
  if (process.env.GROQ_API_KEY) {
    tasks.push(runTimed('groq', () => callGroq(params)))
  }
  if (process.env.OPENROUTER_API_KEY) {
    tasks.push(runTimed('openrouter', () => callOpenRouter(params)))
  }
  // Always include z-ai-sdk
  tasks.push(runTimed('zai-sdk', () => callZAI(params)))

  return Promise.all(tasks)
}

async function runTimed(
  provider: string,
  fn: () => Promise<ChatResult>
): Promise<ComparisonResult> {
  const start = Date.now()
  try {
    const result = await fn()
    return { provider, content: result.content, latencyMs: Date.now() - start }
  } catch (err: any) {
    return { provider, content: null, latencyMs: Date.now() - start, error: err.message }
  }
}
