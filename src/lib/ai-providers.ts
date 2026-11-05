// ============================================================
// Multi-AI Provider - Support de plusieurs LLMs
//
// Providers supportés (par ordre de priorité) :
//   1. GEMINI_API_KEY    → Google Gemini
//   2. GLM_API_KEY       → Z.ai GLM (glm-4-flash, via open.bigmodel.cn)
//   3. GROQ_API_KEY      → Groq (llama-3.1-70b-versatile)
//   4. OPENROUTER_API_KEY → OpenRouter (multi-modèles)
//   5. ZAI_API_KEY       → Z.ai (chat.z.ai, natif HTTP, toujours dispo en fallback)
//
// ⭐ Fallback chain : si un provider échoue, le suivant est essayé.
//   Le provider Z.ai (chat.z.ai) est toujours essayé en dernier recours.
//
// Usage :
//   import { generateChat } from '@/lib/ai-providers'
//   const reply = await generateChat({ system, user })
// ============================================================

// ⭐ Import statique du SDK z-ai-web-dev-sdk (nécessaire pour le build standalone)
import ZAISdk from 'z-ai-web-dev-sdk'

export interface ChatParams {
  system: string
  user: string
  temperature?: number
  maxTokens?: number
}

// ⭐ Timeout pour tous les appels IA (P0 fix — empêche les hangs)
const AI_TIMEOUT_MS = 60_000 // 60 secondes

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = AI_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timeout)
  }
}

export interface ChatResult {
  content: string
  provider: string
}

// ============================================================
// Détecter le provider actif (basé sur les env vars disponibles)
// ============================================================
export function getActiveProvider(): string | null {
  if (process.env.ZAI_API_KEY) return 'zai'
  if (process.env.GEMINI_API_KEY) return 'gemini'
  if (process.env.GLM_API_KEY) return 'glm'
  if (process.env.GROQ_API_KEY) return 'groq'
  if (process.env.OPENROUTER_API_KEY) return 'openrouter'
  return null
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
    const listRes = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    )
    if (listRes.ok) {
      const listData = await listRes.json()
      const models = listData.models || []
      // Chercher un modèle qui supporte generateContent et qui contient "flash" (rapide + gratuit)
      const flashModel = models.find((m: any) =>
        m.supportedGenerationMethods?.includes('generateContent') &&
        (m.name?.includes('flash') || m.name?.includes('Flash'))
      )
      if (flashModel) {
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
    } else {
      console.error('[Gemini] ListModels API returned:', listRes.status, await listRes.text().catch(() => ''))
    }
  } catch (err) {
    console.error('[Gemini] ListModels fetch error:', err)
  }

  // 2. Fallback : essayer des noms de modèles connus (mis à jour 2025)
  const fallbackModels = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-preview-05-09',
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-002',
    'gemini-pro',
  ]

  for (const model of fallbackModels) {
    try {
      const testRes = await fetchWithTimeout(
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
        console.warn('[Gemini] Found working model:', model)
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
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey, // ⭐ P1 FIX: key in header, not URL
        },
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
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${newModel}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
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
// Provider 2 : Z.ai GLM (open.bigmodel.cn)
// API: https://open.bigmodel.cn/api/paas/v4/chat/completions
// Modèle: glm-4-flash (configurable via GLM_MODEL)
// ⭐ Si GLM_API_KEY est défini, ce provider est utilisé en priorité
// ============================================================
// Cache des modèles GLM/Z.ai disponibles (évite de re-list à chaque appel)
let cachedGLMModel: string | null = null

async function discoverGLMModels(apiKey: string, apiUrl: string): Promise<string[]> {
  if (cachedGLMModel) return [cachedGLMModel]

  const baseUrl = apiUrl.replace('/chat/completions', '/models')
  const models: string[] = []

  // 1. Appeler l'API ListModels
  try {
    const res = await fetchWithTimeout(baseUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    }, 10000)
    if (res.ok) {
      const data = await res.json()
      // L'API Z.ai retourne { data: [{ id: "glm-4-plus" }, ...] }
      const modelList = data.data || data.models || data
      if (Array.isArray(modelList)) {
        for (const m of modelList) {
          const id = m.id || m.name || m.model
          if (id && typeof id === 'string') models.push(id)
        }
      }
      console.warn(`[GLM] ListModels trouvé ${models.length} modèles: ${models.slice(0, 10).join(', ')}`)
    } else {
      console.warn(`[GLM] ListModels échec: ${res.status}`)
    }
  } catch (err) {
    console.warn(`[GLM] ListModels erreur:`, (err as Error).message)
  }

  // 2. Ajouter des modèles connus en fallback
  const fallback = ['glm-4-plus', 'glm-4', 'glm-4-air', 'glm-4-flash', 'glm-3-turbo', 'glm-4-flashx']
  for (const f of fallback) {
    if (!models.includes(f)) models.push(f)
  }

  // 3. Si GLM_MODEL est défini, le mettre en premier
  const envModel = process.env.GLM_MODEL
  if (envModel && !models.includes(envModel)) {
    models.unshift(envModel)
  } else if (envModel) {
    models.unshift(envModel) // priorité
  }

  return models
}

async function callGLM(params: ChatParams): Promise<ChatResult> {
  const apiKey = process.env.GLM_API_KEY!
  const apiUrl = process.env.GLM_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

  // ⭐ Discovery dynamique: récupérer la liste des modèles disponibles
  const models = await discoverGLMModels(apiKey, apiUrl)

  let lastErr = ''
  for (const model of models) {
    try {
      const res = await fetchWithTimeout(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: params.system },
            { role: 'user', content: params.user },
          ],
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 2000,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content || ''
        if (!content) {
          lastErr = 'réponse vide'
          continue
        }
        cachedGLMModel = model // Cache le modèle qui marche
        console.warn(`[GLM] OK model=${model}`)
        return { content, provider: 'glm' }
      }
      const err = await res.text()
      lastErr = `${res.status}: ${err.slice(0, 200)}`
      console.warn(`[GLM] model=${model} → ${res.status}`)
    } catch (err: any) {
      lastErr = err.message
    }
  }
  throw new Error(`GLM: tous les modèles ont échoué (${models.length} testés). Dernier: ${lastErr}`)
}

// ============================================================
// Provider 3 : Groq (ultra-rapide, Llama 3.1/3.3)
// ============================================================
async function callGroq(params: ChatParams): Promise<ChatResult> {
  const apiKey = process.env.GROQ_API_KEY!
  // Essayer plusieurs modèles (certains peuvent être dépréciés)
  const models = [
    process.env.GROQ_MODEL,
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'gemma2-9b-it',
  ].filter(Boolean) as string[]

  let lastErr = ''
  for (const model of models) {
    try {
      const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: params.system },
            { role: 'user', content: params.user },
          ],
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 2000,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content || ''
        if (!content) {
          lastErr = 'réponse vide'
          continue
        }
        console.warn(`[Groq] OK model=${model}`)
        return { content, provider: 'groq' }
      }
      const err = await res.text()
      lastErr = `${res.status}: ${err.slice(0, 200)}`
      console.warn(`[Groq] model=${model} → ${res.status}`)
    } catch (err: any) {
      lastErr = err.message
    }
  }
  throw new Error(`Groq: tous les modèles ont échoué. Dernier: ${lastErr}`)
}

// ============================================================
// Provider 4 : OpenRouter (multi-modèles)
// ============================================================
async function callOpenRouter(params: ChatParams): Promise<ChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY!
  const models = [
    process.env.OPENROUTER_MODEL,
    'meta-llama/llama-3.1-8b-instruct',
    'meta-llama/llama-3.2-3b-instruct:free',
    'google/gemini-flash-1.5:free',
    'mistralai/mistral-7b-instruct:free',
  ].filter(Boolean) as string[]

  let lastErr = ''
  for (const model of models) {
    try {
      const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://datasphere.app',
          'X-Title': 'DataSphere',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: params.system },
            { role: 'user', content: params.user },
          ],
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 2000,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content || ''
        if (!content) {
          lastErr = 'réponse vide'
          continue
        }
        console.warn(`[OpenRouter] OK model=${model}`)
        return { content, provider: 'openrouter' }
      }
      const err = await res.text()
      lastErr = `${res.status}: ${err.slice(0, 200)}`
      console.warn(`[OpenRouter] model=${model} → ${res.status}`)
    } catch (err: any) {
      lastErr = err.message
    }
  }
  throw new Error(`OpenRouter: tous les modèles ont échoué. Dernier: ${lastErr}`)
}

// ============================================================
// Provider 5 : Z.ai (api.z.ai) — plateforme internationale
// ⭐ Utilise UNIQUEMENT ZAI_API_KEY (pas GLM_API_KEY)
// ⭐ Utilise UNIQUEMENT api.z.ai (pas open.bigmodel.cn)
// Les clés ZAI et GLM sont INCOMPATIBLES (plateformes différentes)
// ============================================================
async function callZAI(params: ChatParams): Promise<ChatResult> {
  const apiKey = process.env.ZAI_API_KEY
  if (!apiKey) {
    throw new Error('ZAI_API_KEY non configuré')
  }

  // URL: api.z.ai uniquement (pas open.bigmodel.cn)
  const apiUrl = process.env.ZAI_API_URL || 'https://api.z.ai/api/paas/v4/chat/completions'

  // Discovery dynamique des modèles
  const models = await discoverGLMModels(apiKey, apiUrl)

  let lastErr = ''
  for (const model of models) {
    try {
      const res = await fetchWithTimeout(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: params.system },
            { role: 'user', content: params.user },
          ],
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 2000,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content || ''
        if (!content) {
          lastErr = 'réponse vide'
          continue
        }
        cachedGLMModel = model
        console.warn(`[Z.ai] OK via ${apiUrl} model=${model}`)
        return { content, provider: 'zai' }
      }

      const errText = await res.text()
      lastErr = `${res.status}: ${errText.slice(0, 300)}`
      console.warn(`[Z.ai] ${apiUrl} model=${model} → ${res.status}`)
    } catch (err: any) {
      lastErr = err.message
    }
  }

  throw new Error(`Z.ai: tous les modèles ont échoué sur api.z.ai. Dernière erreur: ${lastErr}`)
}

// ============================================================
// Provider 6 : z-ai-web-dev-sdk — uniquement en sandbox explicitement configuré.
// En production, il requiert un fichier .z-ai-config et ne peut pas être utilisé comme fallback universel.
// ============================================================
async function callZAISdk(params: ChatParams): Promise<ChatResult> {
  const zai = await ZAISdk.create()
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: params.system },
      { role: 'user', content: params.user },
    ],
    thinking: { type: 'disabled' },
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens ?? 2000,
  })
  const content = completion.choices?.[0]?.message?.content || ''
  if (!content) throw new Error('z-ai-sdk: réponse vide')
  console.warn('[z-ai-sdk] OK (fallback sans clé API)')
  return { content, provider: 'z-ai-sdk' }
}

// ============================================================
// Fonction principale : génère une réponse chat
// Utilise le 1er provider disponible (ordre de priorité)
// ⭐ Si le provider principal échoue, fallback vers le suivant
// ============================================================
export function isZAISdkFallbackEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ENABLE_ZAI_SDK_FALLBACK === 'true'
}

export async function generateChat(params: ChatParams): Promise<ChatResult> {
  // Construire la liste des providers disponibles par ordre de priorité
  // ⭐ ZAI (api.z.ai international) en PRIORITÉ si configuré
  const providers: { name: string; fn: (p: ChatParams) => Promise<ChatResult> }[] = []
  
  // 1. Z.ai international (api.z.ai) — si ZAI_API_KEY est défini
  if (process.env.ZAI_API_KEY) providers.push({ name: 'zai', fn: callZAI })
  // 2. Gemini
  if (process.env.GEMINI_API_KEY) providers.push({ name: 'gemini', fn: callGemini })
  // 3. GLM chinois (open.bigmodel.cn) — si GLM_API_KEY est défini
  if (process.env.GLM_API_KEY) providers.push({ name: 'glm', fn: callGLM })
  // 4. Groq
  if (process.env.GROQ_API_KEY) providers.push({ name: 'groq', fn: callGroq })
  // 5. OpenRouter
  if (process.env.OPENROUTER_API_KEY) providers.push({ name: 'openrouter', fn: callOpenRouter })
  // Le SDK de développement nécessite .z-ai-config : opt-in uniquement hors production.
  if (isZAISdkFallbackEnabled()) providers.push({ name: 'z-ai-sdk', fn: callZAISdk })

  if (providers.length === 0) {
    throw new Error('Aucun fournisseur IA configuré. Définissez GEMINI_API_KEY, ZAI_API_KEY, GLM_API_KEY, GROQ_API_KEY ou OPENROUTER_API_KEY sur le serveur.')
  }

  // Essayer chaque provider en séquence jusqu'à ce qu'un réussisse
  let lastError: Error | null = null
  for (const { name, fn } of providers) {
    try {
      const result = await fn(params)
      return result
    } catch (err: any) {
      console.error(`[AI] Provider "${name}" failed:`, err.message)
      lastError = err
      // Continuer vers le prochain provider
    }
  }

  // Tous les providers ont échoué
  throw new Error(`Les fournisseurs IA configurés ont échoué. Vérifiez les clés, les quotas et les modèles sur le serveur. Dernière erreur: ${lastError?.message || 'inconnue'}`)
}

// ============================================================
// Helper : liste les providers disponibles (pour /api/health)
// ============================================================
export function getAvailableProviders(): string[] {
  const providers: string[] = []
  if (process.env.ZAI_API_KEY) providers.push('zai')
  if (process.env.GEMINI_API_KEY) providers.push('gemini')
  if (process.env.GLM_API_KEY) providers.push('glm')
  if (process.env.GROQ_API_KEY) providers.push('groq')
  if (process.env.OPENROUTER_API_KEY) providers.push('openrouter')
  if (isZAISdkFallbackEnabled()) providers.push('z-ai-sdk')
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

  if (process.env.ZAI_API_KEY) {
    tasks.push(runTimed('zai', () => callZAI(params)))
  }
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
