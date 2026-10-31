import { test, expect } from '@playwright/test'
import { createLinkedInState, verifyLinkedInState } from '../../src/lib/linkedin-oauth-state'
import { encryptLinkedInToken, decryptLinkedInToken } from '../../src/lib/linkedin-token-crypto'
import { verifySession } from '../../src/lib/auth'
import { createHmac } from 'node:crypto'

test.describe('Security regression: OAuth, sessions, token encryption', () => {
  test.beforeAll(() => {
    process.env.DATASPHERE_AUTH_SECRET = 'test-secret-must-have-at-least-32-characters'
    process.env.LINKEDIN_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
  })
  test('OAuth state validates owner, signature and freshness', () => {
    const valid = createLinkedInState('userA')
    expect(verifyLinkedInState(valid, 'userA')).toBe(true)
    expect(verifyLinkedInState(valid, 'userB')).toBe(false)
    expect(verifyLinkedInState(valid + 'x', 'userA')).toBe(false)
    const [payload] = valid.split('.')
    const changed = Buffer.from(JSON.stringify({ userId: 'userB', ts: Date.now(), nonce: '0'.repeat(48) })).toString('base64url')
    expect(verifyLinkedInState(changed + '.' + valid.split('.')[1], 'userB')).toBe(false)
    const expiredPayload = Buffer.from(JSON.stringify({ userId: 'userA', ts: Date.now() - 11 * 60_000, nonce: '0'.repeat(48) })).toString('base64url')
    const signature = createHmac('sha256', process.env.DATASPHERE_AUTH_SECRET!).update(expiredPayload).digest('base64url')
    expect(verifyLinkedInState(expiredPayload + '.' + signature, 'userA')).toBe(false)
    expect(payload).toBeTruthy()
  })
  test('encrypted tokens round trip, reject tampering and legacy plaintext', () => {
    const raw = 'sample-sensitive-access-token'
    const encrypted = encryptLinkedInToken(raw)
    expect(encrypted).not.toContain(raw)
    expect(decryptLinkedInToken(encrypted)).toBe(raw)
    expect(() => decryptLinkedInToken(encrypted.slice(0, -2) + 'xx')).toThrow()
    expect(() => decryptLinkedInToken(raw)).toThrow(/Legacy plaintext/)
  })
  test('expired session and legacy session are rejected', () => {
    expect(verifySession('userA.signature')).toBeNull()
    const expiresAt = Date.now() - 5000
    const payload = `v2.userA.${expiresAt}`
    const signature = createHmac('sha256', process.env.DATASPHERE_AUTH_SECRET!).update(payload).digest('base64url')
    expect(verifySession(`${payload}.${signature}`)).toBeNull()
  })
})
