// ============================================================
// Instrumentation hook (Next.js)
// Initialise Sentry côté serveur au démarrage
// ============================================================

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@/lib/sentry')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('@/lib/sentry')
  }
}
