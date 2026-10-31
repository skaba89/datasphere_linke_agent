import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const MAX_AGE_MS = 10 * 60 * 1000

function secret(): string {
  const value = process.env.DATASPHERE_AUTH_SECRET
  if (!value || value.length < 32) throw new Error('DATASPHERE_AUTH_SECRET must be at least 32 characters')
  return value
}

export function createLinkedInState(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, ts: Date.now(), nonce: randomBytes(24).toString('hex') })).toString('base64url')
  const signature = createHmac('sha256', secret()).update(payload).digest('base64url')
  return payload + '.' + signature
}

export function verifyLinkedInState(state: string, authenticatedUserId: string): boolean {
  if (typeof state !== 'string' || state.length > 2048) return false
  const parts = state.split('.')
  if (parts.length !== 2) return false
  const [payload, signature] = parts
  const expected = createHmac('sha256', secret()).update(payload).digest()
  let received: Buffer
  try { received = Buffer.from(signature, 'base64url') } catch { return false }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof data.userId === 'string' && data.userId === authenticatedUserId &&
      Number.isSafeInteger(data.ts) && data.ts <= Date.now() &&
      Date.now() - data.ts <= MAX_AGE_MS && typeof data.nonce === 'string' &&
      /^[a-f0-9]{48}$/.test(data.nonce)
  } catch { return false }
}
