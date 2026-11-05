import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateChat, getOpenRouterModel } from '@/lib/ai-providers'

const KEYS = ['ZAI_API_KEY', 'GEMINI_API_KEY', 'GLM_API_KEY', 'GROQ_API_KEY'] as const

function configureOpenRouter() {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('ENABLE_ZAI_SDK_FALLBACK', '')
  for (const key of KEYS) vi.stubEnv(key, '')
  vi.stubEnv('OPENROUTER_API_KEY', 'unit-test-key-not-real')
}

describe('OpenRouter current model routing', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('uses the maintained free router rather than obsolete hard-coded models', () => {
    configureOpenRouter()
    vi.stubEnv('OPENROUTER_MODEL', '')
    expect(getOpenRouterModel()).toBe('openrouter/free')
  })

  it('honors an explicitly configured model identifier', () => {
    configureOpenRouter()
    vi.stubEnv('OPENROUTER_MODEL', '  custom/provider-model  ')
    expect(getOpenRouterModel()).toBe('custom/provider-model')
  })

  it('sends only one completion to the selected model', async () => {
    configureOpenRouter()
    vi.stubEnv('OPENROUTER_MODEL', '')
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ choices: [{ message: { content: 'Test post LinkedIn' } }] }),
    })
    vi.stubGlobal('fetch', mockFetch)
    const result = await generateChat({ system: 'Test', user: 'Rédige un post' })
    expect(result).toEqual({ provider: 'openrouter', content: 'Test post LinkedIn' })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(JSON.parse(options.body).model).toBe('openrouter/free')
  })

  it('reports missing models with an actionable 404 and does not retry obsolete models', async () => {
    configureOpenRouter()
    vi.stubEnv('OPENROUTER_MODEL', 'outdated/model:free')
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false, status: 404,
      json: async () => ({ error: { message: 'Model no longer available' } }),
    })
    vi.stubGlobal('fetch', mockFetch)
    await expect(generateChat({ system: 'Test', user: 'Test' }))
      .rejects.toThrow('OpenRouter (HTTP 404) : modèle outdated/model:free indisponible')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('reports rate limiting without exposing provider data', async () => {
    configureOpenRouter()
    vi.stubEnv('OPENROUTER_MODEL', '')
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false, status: 429,
      json: async () => ({ error: { message: 'sensitive detail' } }),
    })
    vi.stubGlobal('fetch', mockFetch)
    await expect(generateChat({ system: 'Test', user: 'Test' }))
      .rejects.toThrow('OpenRouter (HTTP 429) : limite de requêtes atteinte')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
