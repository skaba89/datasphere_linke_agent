import { describe, it, expect, beforeAll } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifySession } from '@/lib/auth'

// ============================================================
// Tests unitaires — lib/auth.ts
//
// Teste verifySession (session cookie HMAC-SHA256 v2 format)
// ============================================================

const TEST_SECRET = 'test-jwt-secret-must-have-at-least-32-characters-xxx'

function sign(payload: string): string {
  return createHmac('sha256', TEST_SECRET).update(payload).digest('base64url')
}

function makeSession(userId: string, expiresAt: number): string {
  const payload = `v2.${userId}.${expiresAt}`
  return `${payload}.${sign(payload)}`
}

describe('lib/auth.ts — verifySession', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET
  })

  it('returns userId for a valid v2 session', () => {
    const userId = 'user_abc123'
    const expires = Date.now() + 60_000
    const session = makeSession(userId, expires)
    expect(verifySession(session)).toBe(userId)
  })

  it('returns null for v1 format (legacy)', () => {
    expect(verifySession('user_abc.signature')).toBeNull()
  })

  it('returns null for malformed (wrong parts count)', () => {
    expect(verifySession('v2.user')).toBeNull()
    expect(verifySession('v2.user.123')).toBeNull()
    expect(verifySession('v2.user.123.sig.extra')).toBeNull()
  })

  it('returns null for expired session', () => {
    const userId = 'user_abc123'
    const expires = Date.now() - 5000 // expired 5s ago
    const session = makeSession(userId, expires)
    expect(verifySession(session)).toBeNull()
  })

  it('returns null for session expiring now', () => {
    const userId = 'user_abc123'
    const now = 1_700_000_000_000
    const session = makeSession(userId, now) // expires == now → expired
    expect(verifySession(session, now)).toBeNull()
  })

  it('returns null for tampered signature', () => {
    const userId = 'user_abc123'
    const expires = Date.now() + 60_000
    const session = makeSession(userId, expires)
    const tampered = session.slice(0, -2) + 'xx'
    expect(verifySession(tampered)).toBeNull()
  })

  it('returns null for signature with wrong secret', () => {
    const userId = 'user_abc123'
    const expires = Date.now() + 60_000
    const payload = `v2.${userId}.${expires}`
    const wrongSig = createHmac('sha256', 'wrong-secret-of-at-least-32-characters-xxx')
      .update(payload).digest('base64url')
    const session = `${payload}.${wrongSig}`
    expect(verifySession(session)).toBeNull()
  })

  it('returns null for invalid userId (special chars)', () => {
    const userId = 'user with spaces'
    const expires = Date.now() + 60_000
    const payload = `v2.${userId}.${expires}`
    const session = `${payload}.${sign(payload)}`
    expect(verifySession(session)).toBeNull()
  })

  it('returns null for non-integer expires', () => {
    const userId = 'user_abc123'
    const payload = `v2.${userId}.not-a-number`
    const session = `${payload}.${sign(payload)}`
    expect(verifySession(session)).toBeNull()
  })

  it('returns null for invalid base64url signature', () => {
    const userId = 'user_abc123'
    const expires = Date.now() + 60_000
    const session = `v2.${userId}.${expires}.!!!invalid-base64!!!`
    expect(verifySession(session)).toBeNull()
  })

  it('accepts userId with hyphens and underscores', () => {
    const userId = 'usr_abc-XYZ_123'
    const expires = Date.now() + 60_000
    const session = makeSession(userId, expires)
    expect(verifySession(session)).toBe(userId)
  })

  it('accepts userId up to 128 chars', () => {
    const userId = 'a'.repeat(128)
    const expires = Date.now() + 60_000
    const session = makeSession(userId, expires)
    expect(verifySession(session)).toBe(userId)
  })

  it('rejects userId over 128 chars', () => {
    const userId = 'a'.repeat(129)
    const expires = Date.now() + 60_000
    const session = makeSession(userId, expires)
    expect(verifySession(session)).toBeNull()
  })
})

describe('lib/auth.ts — secret validation', () => {
  it('throws if JWT_SECRET is missing', () => {
    const original = process.env.JWT_SECRET
    delete process.env.JWT_SECRET
    delete process.env.DATASPHERE_AUTH_SECRET
    // Use a session that passes all pre-validation (valid userId, future expires)
    // so that sign() is called, which calls secret()
    const futureExpires = Date.now() + 60_000
    const session = `v2.validuser.${futureExpires}.fakesig`
    expect(() => verifySession(session)).toThrow()
    process.env.JWT_SECRET = original
  })

  it('throws if JWT_SECRET is too short (< 32 chars)', () => {
    const original = process.env.JWT_SECRET
    process.env.JWT_SECRET = 'short'
    const futureExpires = Date.now() + 60_000
    const session = `v2.validuser.${futureExpires}.fakesig`
    expect(() => verifySession(session)).toThrow()
    process.env.JWT_SECRET = original
  })
})
