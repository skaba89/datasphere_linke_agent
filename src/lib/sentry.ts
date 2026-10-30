import * as Sentry from '@sentry/nextjs'

// ============================================================
// Sentry initialization
//
// Pour activer :
//   1. Créer un projet sur https://sentry.io (Next.js)
//   2. Récupérer le DSN
//   3. Définir SENTRY_DSN dans .env
//   4. (Optionnel) SENTRY_AUTH_TOKEN pour source maps upload
//
// Si SENTRY_DSN n'est pas défini, Sentry est no-op (safe en dev).
// ============================================================

const SENTRY_DSN = process.env.SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE || 'datasphere@1.0.0',

    // Performance monitoring (10% des transactions en prod)
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Ignorer les erreurs non-actionnables
    ignoreErrors: [
      'NEXT_NOT_FOUND',
      'NEXT_REDIRECT',
      'Unauthorized',
      'Non authentifié',
      'Rate limit exceeded',
    ],
  })
}

// ============================================================
// Helpers pour capturer les erreurs avec contexte
// ============================================================
export function captureError(error: Error, context?: Record<string, any>) {
  if (!SENTRY_DSN) return // no-op
  Sentry.captureException(error, {
    extra: context,
  })
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
  if (!SENTRY_DSN) return
  Sentry.captureMessage(message, {
    level,
    extra: context,
  })
}

// Set user context for all future events
export function setSentryUser(user: { id: string; email?: string; plan?: string } | null) {
  if (!SENTRY_DSN) return
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email, plan: user.plan })
  } else {
    Sentry.setUser(null)
  }
}

export { Sentry }
