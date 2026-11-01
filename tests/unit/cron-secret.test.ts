import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================
// Tests unitaires — lib/cron-secret.ts
// ============================================================

const JWT_SECRET = 'test-jwt-secret-must-have-at-least-32-characters-xxx'

describe('lib/cron-secret.ts', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.JWT_SECRET = JWT_SECRET
    delete process.env.CRON_SECRET
    delete process.env.DATASPHERE_AUTH_SECRET
  })

  it('getCronSecret derives stable secret from JWT_SECRET', async () => {
    const { getCronSecret } = await import('@/lib/cron-secret')
    const secret = getCronSecret()
    expect(secret).toBeTruthy()
    expect(typeof secret).toBe('string')
    expect(secret!.length).toBeGreaterThan(30)
    expect(getCronSecret()).toBe(secret) // stable
  })

  it('getCronSecret uses CRON_SECRET if explicitly set', async () => {
    process.env.CRON_SECRET = 'explicit-cron-secret-value'
    const { getCronSecret } = await import('@/lib/cron-secret')
    expect(getCronSecret()).toBe('explicit-cron-secret-value')
  })

  it('getCronSecret returns null if no JWT_SECRET and no CRON_SECRET', async () => {
    delete process.env.JWT_SECRET
    delete process.env.DATASPHERE_AUTH_SECRET
    delete process.env.CRON_SECRET
    const { getCronSecret } = await import('@/lib/cron-secret')
    expect(getCronSecret()).toBeNull()
  })

  it('verifyCronAuth accepts Bearer with correct derived secret', async () => {
    const { getCronSecret, verifyCronAuth } = await import('@/lib/cron-secret')
    const secret = getCronSecret()
    expect(verifyCronAuth(`Bearer ${secret}`)).toBe(true)
  })

  it('verifyCronAuth accepts raw secret (without Bearer prefix)', async () => {
    const { getCronSecret, verifyCronAuth } = await import('@/lib/cron-secret')
    const secret = getCronSecret()
    expect(verifyCronAuth(secret)).toBe(true)
  })

  it('verifyCronAuth rejects null header', async () => {
    const { verifyCronAuth } = await import('@/lib/cron-secret')
    expect(verifyCronAuth(null)).toBe(false)
  })

  it('verifyCronAuth rejects wrong secret', async () => {
    const { verifyCronAuth } = await import('@/lib/cron-secret')
    expect(verifyCronAuth('Bearer wrong-secret')).toBe(false)
  })

  it('verifyCronAuth rejects empty string', async () => {
    const { verifyCronAuth } = await import('@/lib/cron-secret')
    expect(verifyCronAuth('')).toBe(false)
  })
})
