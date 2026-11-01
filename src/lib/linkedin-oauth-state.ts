import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// ============================================================
// LinkedIn OAuth State — Anti-rejeu + Nonce atomique
//
// Sécurité:
//   1. State signé HMAC-SHA256 (ne peut pas être falsifié)
//   2. Nonce unique de 24 bytes (48 hex chars)
//   3. Expiration: 10 minutes max
//   4. Vérification userId (le state doit appartenir au user connecté)
//   5. Anti-rejeu: les nonces utilisés sont stockés en mémoire
//      (en prod multi-instance, utiliser Redis)
// ============================================================

const MAX_AGE_MS = 10 * 60 * 1000

// Store des nonces consommés (en mémoire, TTL 15 min)
// En prod multi-instance, migrer vers Redis avec SETNX + TTL
const consumedNonces = new Map<string, number>()
const NONCE_TTL_MS = 15 * 60 * 1000

// Nettoyage périodique des nonces expirés
function cleanupNonces() {
  const now = Date.now()
  for (const [nonce, consumedAt] of consumedNonces.entries()) {
    if (now - consumedAt > NONCE_TTL_MS) {
      consumedNonces.delete(nonce)
    }
  }
}

function secret(): string {
  const value = process.env.JWT_SECRET || process.env.DATASPHERE_AUTH_SECRET
  if (!value || value.length < 32) throw new Error('JWT_SECRET must be at least 32 characters')
  return value
}

export function createLinkedInState(userId: string): string {
  const nonce = randomBytes(24).toString('hex')
  const payload = Buffer.from(JSON.stringify({
    userId,
    ts: Date.now(),
    nonce,
  })).toString('base64url')
  const signature = createHmac('sha256', secret()).update(payload).digest('base64url')
  return payload + '.' + signature
}

export function verifyLinkedInState(state: string, authenticatedUserId: string): boolean {
  cleanupNonces()

  if (typeof state !== 'string' || state.length > 2048) return false

  const parts = state.split('.')
  if (parts.length !== 2) return false

  const [payload, signature] = parts

  // 1. Vérifier la signature (anti-falsification)
  const expected = createHmac('sha256', secret()).update(payload).digest()
  let received: Buffer
  try {
    received = Buffer.from(signature, 'base64url')
  } catch {
    return false
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return false
  }

  // 2. Parser le payload
  let data: { userId: string; ts: number; nonce: string }
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return false
  }

  // 3. Vérifier le userId (le state doit appartenir au user connecté)
  if (typeof data.userId !== 'string' || data.userId !== authenticatedUserId) {
    return false
  }

  // 4. Vérifier le timestamp (pas dans le futur + pas expiré)
  if (!Number.isSafeInteger(data.ts) || data.ts > Date.now()) {
    return false
  }
  if (Date.now() - data.ts > MAX_AGE_MS) {
    return false
  }

  // 5. Vérifier le nonce (format + anti-rejeu)
  if (typeof data.nonce !== 'string' || !/^[a-f0-9]{48}$/.test(data.nonce)) {
    return false
  }

  // ⭐ Anti-rejeu: si le nonce a déjà été utilisé, rejeter
  if (consumedNonces.has(data.nonce)) {
    console.warn(`[OAuth] Nonce replay detected for user ${authenticatedUserId}`)
    return false
  }

  // ⭐ Consommer le nonce atomiquement (une seule utilisation possible)
  consumedNonces.set(data.nonce, Date.now())

  return true
}
