import { describe, expect, it, vi, afterEach } from 'vitest'
import { AiGenerationTimeoutError, withAiGenerationDeadline } from '@/lib/ai-generation-timeout'

describe('AI generation deadline', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a resolved generation result without altering data', async () => {
    await expect(withAiGenerationDeadline(Promise.resolve(['draft-a']), 100))
      .resolves.toEqual(['draft-a'])
  })

  it('rejects when every AI provider stalls past the deadline', async () => {
    vi.useFakeTimers()
    const operation = withAiGenerationDeadline(new Promise<string>(() => {}), 45_000)
    const assertion = expect(operation).rejects.toBeInstanceOf(AiGenerationTimeoutError)
    await vi.advanceTimersByTimeAsync(45_000)
    await assertion
  })

  it('keeps the original provider error when the provider fails promptly', async () => {
    await expect(withAiGenerationDeadline(Promise.reject(new Error('Provider unavailable')), 100))
      .rejects.toThrow('Provider unavailable')
  })
})
