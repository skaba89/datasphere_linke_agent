// ============================================================
// Rate Limiting global (in-memory)
//
// Limitation : in-memory, ne fonctionne que sur une instance
// Pour la prod multi-instances, migrer vers Upstash Redis :
//   https://github.com/upstash/ratelimit
//
// Limites appliquées :
//   - Global : 100 req / min / IP
//   - Auth login : 5 req / 15 min / IP
//   - Auth register : 3 req / heure / IP
//   - AI generate : 10 req / heure / user
//   - LinkedIn publish : 20 req / heure / user
// ============================================================

interface RateBucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateBucket>()

// Nettoyer les buckets expirés toutes les 10 minutes
const CLEANUP_INTERVAL = 10 * 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt < now) {
      buckets.delete(key)
    }
  }
}

export interface RateLimitConfig {
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt < now) {
    // Nouveau bucket ou bucket expiré
    const bucket: RateBucket = { count: 1, resetAt: now + config.windowMs }
    buckets.set(key, bucket)
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt: bucket.resetAt,
    }
  }

  existing.count++
  const allowed = existing.count <= config.limit

  return {
    allowed,
    limit: config.limit,
    remaining: Math.max(0, config.limit - existing.count),
    resetAt: existing.resetAt,
  }
}

// ============================================================
// Helpers pour les limites standard
// ============================================================

export const RATE_LIMITS = {
  global: { limit: 100, windowMs: 60 * 1000 }, // 100/min
  login: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5/15min
  register: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3/h
  aiGenerate: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10/h/user
  linkedinPublish: { limit: 20, windowMs: 60 * 60 * 1000 }, // 20/h/user
  linkedinAuth: { limit: 5, windowMs: 10 * 60 * 1000 }, // 5/10min
} as const

// ============================================================
// Helper : extraire l'IP d'une Request
// ============================================================
export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

// ============================================================
// Helper : appliquer le rate limit à une route API
// ============================================================
export function applyRateLimit(
  request: Request,
  keyPrefix: string,
  config: RateLimitConfig,
  identifier?: string
): RateLimitResult {
  const ip = getClientIP(request)
  const id = identifier || ip
  return checkRateLimit(`${keyPrefix}:${id}`, config)
}

// ============================================================
// Helper : construire les headers de réponse pour rate limit
// ============================================================
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  }
}
