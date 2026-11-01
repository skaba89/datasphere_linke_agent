import { describe, it, expect, beforeAll, vi } from 'vitest'

// ============================================================
// Tests unitaires — lib/linkedin-token-crypto.ts
// ============================================================

const VALID_KEY = Buffer.alloc(32, 7).toString('base64') // 32 bytes of 0x07

describe('lib/linkedin-token-crypto.ts', () => {
  beforeAll(() => {
    process.env.LINKEDIN_TOKEN_ENCRYPTION_KEY = VALID_KEY
  })

  it('encryptLinkedInToken returns enc1. format', async () => {
    const { encryptLinkedInToken } = await import('@/lib/linkedin-token-crypto')
    const encrypted = encryptLinkedInToken('my-secret-token')
    expect(encrypted).toMatch(/^enc1\./)
    expect(encrypted.split('.').length).toBe(4) // enc1.iv.authtag.ciphertext
  })

  it('encrypted token does not contain plaintext', async () => {
    const { encryptLinkedInToken } = await import('@/lib/linkedin-token-crypto')
    const plaintext = 'my-very-secret-token-12345'
    const encrypted = encryptLinkedInToken(plaintext)
    expect(encrypted).not.toContain(plaintext)
  })

  it('decryptLinkedInToken recovers the original token (round trip)', async () => {
    const { encryptLinkedInToken, decryptLinkedInToken } = await import('@/lib/linkedin-token-crypto')
    const plaintext = 'AQX-test-token-abc123'
    const encrypted = encryptLinkedInToken(plaintext)
    const decrypted = decryptLinkedInToken(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it('each encryption produces different ciphertext (random IV)', async () => {
    const { encryptLinkedInToken } = await import('@/lib/linkedin-token-crypto')
    const plaintext = 'same-token'
    const e1 = encryptLinkedInToken(plaintext)
    const e2 = encryptLinkedInToken(plaintext)
    expect(e1).not.toBe(e2) // IV different
    // But both decrypt to the same plaintext
    const { decryptLinkedInToken } = await import('@/lib/linkedin-token-crypto')
    expect(decryptLinkedInToken(e1)).toBe(plaintext)
    expect(decryptLinkedInToken(e2)).toBe(plaintext)
  })

  it('decryptLinkedInToken rejects tampered ciphertext', async () => {
    const { encryptLinkedInToken, decryptLinkedInToken } = await import('@/lib/linkedin-token-crypto')
    const encrypted = encryptLinkedInToken('my-token')
    // Tamper the ciphertext (last 2 chars)
    const tampered = encrypted.slice(0, -2) + 'xx'
    expect(() => decryptLinkedInToken(tampered)).toThrow()
  })

  it('decryptLinkedInToken rejects tampered auth tag', async () => {
    const { encryptLinkedInToken, decryptLinkedInToken } = await import('@/lib/linkedin-token-crypto')
    const encrypted = encryptLinkedInToken('my-token')
    const parts = encrypted.split('.')
    // Tamper the auth tag (parts[2])
    parts[2] = parts[2].slice(0, -2) + 'xx'
    const tampered = parts.join('.')
    expect(() => decryptLinkedInToken(tampered)).toThrow()
  })

  it('decryptLinkedInToken rejects legacy plaintext tokens', async () => {
    const { decryptLinkedInToken } = await import('@/lib/linkedin-token-crypto')
    expect(() => decryptLinkedInToken('legacy-plaintext-token')).toThrow(/Legacy plaintext/)
  })

  it('decryptLinkedInToken rejects malformed enc1. tokens', async () => {
    const { decryptLinkedInToken } = await import('@/lib/linkedin-token-crypto')
    expect(() => decryptLinkedInToken('enc1.invalid')).toThrow()
    expect(() => decryptLinkedInToken('enc1.a.b')).toThrow()
    expect(() => decryptLinkedInToken('enc1.a.b.c.d')).toThrow()
  })

  it('isEncryptionConfigured returns true when key is set', async () => {
    const { isEncryptionConfigured } = await import('@/lib/linkedin-token-crypto')
    expect(isEncryptionConfigured()).toBe(true)
  })

  it('isEncryptionConfigured returns false when key is missing', async () => {
    const original = process.env.LINKEDIN_TOKEN_ENCRYPTION_KEY
    delete process.env.LINKEDIN_TOKEN_ENCRYPTION_KEY
    vi.resetModules()
    const { isEncryptionConfigured } = await import('@/lib/linkedin-token-crypto')
    expect(isEncryptionConfigured()).toBe(false)
    process.env.LINKEDIN_TOKEN_ENCRYPTION_KEY = original
  })

  it('encryptLinkedInToken with empty string returns empty string', async () => {
    const { encryptLinkedInToken } = await import('@/lib/linkedin-token-crypto')
    expect(encryptLinkedInToken('')).toBe('')
  })
})
