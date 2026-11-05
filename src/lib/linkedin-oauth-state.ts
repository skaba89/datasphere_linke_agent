import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { db } from '@/lib/db'

// The OAuth state is signed and bound to the authenticated user.
// Replay protection is shared across all application instances through a
// PostgreSQL UNIQUE constraint. A database outage must deny the callback.
const MAX_AGE_MS = 10 * 60 * 1000
const NONCE_TTL_MS = 15 * 60 * 1000

function secret(): string {
  const value = process.env.JWT_SECRET || process.env.DATASPHERE_AUTH_SECRET
  if (!value || value.length < 32) throw new Error('JWT_SECRET must be at least 32 characters')
  return value
}

export function createLinkedInState(userId: string): string {
  const nonce = randomBytes(24).toString('hex')
  const payload = Buffer.from(JSON.stringify({ userId, ts: Date.now(), nonce })).toString('base64url')
  const signature = createHmac('sha256', secret()).update(payload).digest('base64url')
  return payload + '.' + signature
}

/**
 * Consumes a state once for the entire deployment, not once per Node process.
 * Reject invalid or replayed states. If persistence fails, reject instead of
 * silently falling back to an in-memory nonce cache.
 */
export async function verifyLinkedInState(state: string, authenticatedUserId: string): Promise<boolean> {
  if (typeof state !== 'string' || state.length > 2048) return false
  const parts = state.split('.')
  if (parts.length !== 2) return false

  const [payload, signature] = parts
  const expected = createHmac('sha256', secret()).update(payload).digest()
  let received: Buffer
  try {
    received = Buffer.from(signature, 'base64url')
  } catch {
    return false
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false

  let data: { userId: string; ts: number; nonce: string }
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return false
  }
  if (typeof data.userId !== 'string' || data.userId !== authenticatedUserId) return false
  const now = Date.now()
  if (!Number.isSafeInteger(data.ts) || data.ts > now || now - data.ts > MAX_AGE_MS) return false
  if (typeof data.nonce !== 'string' || !/^[a-f0-9]{48}$/.test(data.nonce)) return false

  // Hash the nonce so the replay table never stores the raw state secret.
  const nonceHash = createHash('sha256').update(data.nonce).digest('hex')
  try {
    await db.oAuthConsumedState.create({
      data: { nonceHash, expiresAt: new Date(data.ts + NONCE_TTL_MS) },
    })
    return true
  } catch {
    // Unique-constraint violation (replay) or unavailable DB: fail closed.
    return false
  }
}
