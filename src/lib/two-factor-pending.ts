import { randomBytes, createHmac } from 'node:crypto'

// ============================================================
// 2FA Pending Tokens — tokens temporaires pour le login 2FA
//
// Quand un user avec 2FA activé se connecte, le login route génère
// un token pending (5 min TTL). L'utilisateur doit ensuite appeler
// /api/2fa/verify avec ce token + son code TOTP pour obtenir
// la session cookie.
//
// En mémoire (non distribué) — pour multi-instance, migrer vers Redis.
// ============================================================

const twoFactorPending = new Map<string, { userId: string; expiresAt: number }>()
const TWO_FACTOR_TTL_MS = 5 * 60 * 1000 // 5 min

export function generate2FAPendingToken(userId: string): string {
  const nonce = randomBytes(24).toString('hex')
  const payload = `2fa.${userId}.${nonce}`
  const secret = process.env.JWT_SECRET || 'dev-insecure-secret-change-me-must-be-32-chars'
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  const token = `${payload}.${sig}`
  twoFactorPending.set(token, { userId, expiresAt: Date.now() + TWO_FACTOR_TTL_MS })
  return token
}

export function consume2FAPendingToken(token: string): string | null {
  const entry = twoFactorPending.get(token)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    twoFactorPending.delete(token)
    return null
  }
  twoFactorPending.delete(token) // one-time use
  return entry.userId
}
