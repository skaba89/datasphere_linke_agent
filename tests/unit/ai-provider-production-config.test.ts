import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateChat, getAvailableProviders, isZAISdkFallbackEnabled } from '@/lib/ai-providers'

const AI_KEYS = [
  'ZAI_API_KEY', 'GEMINI_API_KEY', 'GLM_API_KEY',
  'GROQ_API_KEY', 'OPENROUTER_API_KEY',
] as const

describe('AI provider production configuration', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('does not claim the sandbox SDK is available by default in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ENABLE_ZAI_SDK_FALLBACK', 'true')
    for (const key of AI_KEYS) vi.stubEnv(key, '')
    expect(isZAISdkFallbackEnabled()).toBe(false)
    expect(getAvailableProviders()).toEqual([])
  })

  it('reports missing providers explicitly rather than missing .z-ai-config', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    for (const key of AI_KEYS) vi.stubEnv(key, '')
    await expect(generateChat({
      system: 'Test', user: 'Test',
    })).rejects.toThrow('Aucun fournisseur IA configuré')
  })

  it('advertises configured API providers and not an unconfigured SDK', () => {
    vi.stubEnv('NODE_ENV', 'production')
    for (const key of AI_KEYS) vi.stubEnv(key, '')
    vi.stubEnv('GEMINI_API_KEY', 'configured-for-test-only')
    expect(getAvailableProviders()).toEqual(['gemini'])
  })

  it('allows explicit sandbox fallback only outside production', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('ENABLE_ZAI_SDK_FALLBACK', 'true')
    for (const key of AI_KEYS) vi.stubEnv(key, '')
    expect(isZAISdkFallbackEnabled()).toBe(true)
    expect(getAvailableProviders()).toEqual(['z-ai-sdk'])
  })
})
