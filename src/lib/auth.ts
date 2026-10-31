import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30
function secret(): string {
  const value = process.env.DATASPHERE_AUTH_SECRET
  if (!value || value.length < 32) throw new Error('DATASPHERE_AUTH_SECRET must be at least 32 characters')
  return value
}
function sign(payload: string): Buffer {
  return createHmac('sha256', secret()).update(payload).digest()
}
export function verifySession(value: string, now = Date.now()): string | null {
  const parts = value.split('.')
  if (parts.length !== 4 || parts[0] !== 'v2') return null
  const [, userId, expiresText, signature] = parts
  const expires = Number(expiresText)
  if (!userId || !/^[a-zA-Z0-9_-]{1,128}$/.test(userId) || !Number.isSafeInteger(expires) || expires <= now) return null
  const expected = sign(`v2.${userId}.${expiresText}`)
  let actual: Buffer
  try { actual = Buffer.from(signature, 'base64url') } catch { return null }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
  return userId
}
export async function getCurrentUserId(): Promise<string | null> {
  const value = (await cookies()).get('datasphere_session')?.value
  return value ? verifySession(value) : null
}
export async function setSessionCookie(userId: string): Promise<void> {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000
  const payload = `v2.${userId}.${expiresAt}`
  ;(await cookies()).set('datasphere_session', `${payload}.${sign(payload).toString('base64url')}`, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', path: '/', maxAge: MAX_AGE_SECONDS,
  })
}
export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete('datasphere_session')
}
