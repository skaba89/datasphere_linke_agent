import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ consume: vi.fn() }))
vi.mock('@/lib/db', () => ({ db: { oAuthConsumedState: { create: mocks.consume } } }))

import { createLinkedInState, verifyLinkedInState } from '@/lib/linkedin-oauth-state'

describe('LinkedIn OAuth distributed state replay protection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret-more-than-thirty-two-characters'
  })

  it('accepts signed state once and persists hashed nonce', async () => {
    mocks.consume.mockResolvedValueOnce({ nonceHash: 'saved' })
    const state = createLinkedInState('user-a')
    expect(await verifyLinkedInState(state, 'user-a')).toBe(true)
    expect(mocks.consume).toHaveBeenCalledTimes(1)
    const stored = mocks.consume.mock.calls[0][0].data
    expect(stored.nonceHash).toMatch(/^[a-f0-9]{64}$/)
    expect(state).not.toContain(stored.nonceHash)
  })

  it('denies replay even when a different instance receives it', async () => {
    mocks.consume.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('P2002 unique constraint'))
    const state = createLinkedInState('user-a')
    expect(await verifyLinkedInState(state, 'user-a')).toBe(true)
    expect(await verifyLinkedInState(state, 'user-a')).toBe(false)
    expect(mocks.consume).toHaveBeenCalledTimes(2)
    expect(mocks.consume.mock.calls[0][0].data.nonceHash)
      .toBe(mocks.consume.mock.calls[1][0].data.nonceHash)
  })

  it('fails closed on unavailable database', async () => {
    mocks.consume.mockRejectedValueOnce(new Error('database unreachable'))
    expect(await verifyLinkedInState(createLinkedInState('user-a'), 'user-a')).toBe(false)
  })

  it('refuses mismatched user and malformed state without DB writes', async () => {
    const state = createLinkedInState('user-a')
    expect(await verifyLinkedInState(state, 'user-b')).toBe(false)
    expect(await verifyLinkedInState('invalid', 'user-a')).toBe(false)
    expect(mocks.consume).not.toHaveBeenCalled()
  })

  it('refuses a tampered signature without consuming it', async () => {
    const state = createLinkedInState('user-a')
    const [payload] = state.split('.')
    expect(await verifyLinkedInState(payload + '.invalid', 'user-a')).toBe(false)
    expect(mocks.consume).not.toHaveBeenCalled()
  })
})
