// ============================================================
// App URL Helper - Récupère l'URL publique de l'app
//
// Ordre de priorité :
//   1. NEXT_PUBLIC_APP_URL (si défini manuellement)
//   2. RENDER_EXTERNAL_URL (auto-exposé par Render)
//   3. Origin de la requête (si request fournie)
//   4. Fallback localhost (dev)
// ============================================================

export function getAppUrl(request?: Request): string {
  // 1. Variable d'env explicite (priorité haute)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '') // strip trailing slash
  }

  // 2. Render expose automatiquement RENDER_EXTERNAL_URL
  //    (ex: https://datasphere.onrender.com)
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')
  }

  // 3. Déduire depuis la requête (pour les routes API)
  if (request) {
    try {
      const url = new URL(request.url)
      // Sur Render, request.url peut contenir l'URL interne (localhost:10000)
      // mais les headers x-forwarded-* contiennent l'URL publique
      const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '')
      const host = request.headers.get('x-forwarded-host') || url.host
      return `${proto}://${host}`
    } catch {}
  }

  // 4. Fallback dev
  return 'http://localhost:10000'
}
