import { createHmac } from 'node:crypto'

// ============================================================
// Cron Secret Helper
//
// CRON_SECRET est utilisé pour authentifier les appels cron
// (cron-job.org ou Render crons).
//
// Si CRON_SECRET n'est pas défini explicitement, on dérive un
// secret stable depuis JWT_SECRET (via HMAC-SHA256).
// Ainsi, l'utilisateur n'a pas besoin de configurer CRON_SECRET
// manuellement — il suffit d'avoir JWT_SECRET.
// ============================================================

let cachedSecret: string | null = null

export function getCronSecret(): string | null {
  if (cachedSecret) return cachedSecret

  // 1. CRON_SECRET explicite (priorité)
  if (process.env.CRON_SECRET) {
    cachedSecret = process.env.CRON_SECRET
    return cachedSecret
  }

  // 2. Dériver depuis JWT_SECRET (ou DATASPHERE_AUTH_SECRET legacy)
  const jwtSecret = process.env.JWT_SECRET || process.env.DATASPHERE_AUTH_SECRET
  if (jwtSecret && jwtSecret.length >= 32) {
    // HMAC-SHA256 stable : même input = même output
    cachedSecret = createHmac('sha256', jwtSecret)
      .update('datasphere-cron-secret-v1')
      .digest('hex')
    return cachedSecret
  }

  return null
}

// ============================================================
// Vérifier un header Authorization pour un cron
// ============================================================
export function verifyCronAuth(authHeader: string | null): boolean {
  const secret = getCronSecret()
  if (!secret) return false

  // Accepter "Bearer XXX"
  if (authHeader === `Bearer ${secret}`) return true

  // Accepter aussi juste le secret (sans prefix Bearer)
  if (authHeader === secret) return true

  return false
}
