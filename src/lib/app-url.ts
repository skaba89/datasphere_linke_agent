// ============================================================
// App URL Helper - Récupère l'URL publique de l'app
//
// Ordre de priorité :
//   1. NEXT_PUBLIC_APP_URL (si défini ET valide http/https)
//   2. RENDER_EXTERNAL_URL (auto-exposé par Render)
//   3. Origin de la requête (si request fournie)
//   4. Fallback localhost (dev)
// ============================================================

export function getAppUrl(request?: Request): string {
  // 1. Variable d'env explicite (priorité haute)
  //    MAIS on vérifie que c'est bien une URL HTTP valide
  //    (évite le bug où NEXT_PUBLIC_APP_URL contient une DB URL par erreur)
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl.replace(/\/$/, '')
  }

  // 2. Render expose automatiquement RENDER_EXTERNAL_URL
  if (process.env.RENDER_EXTERNAL_URL && process.env.RENDER_EXTERNAL_URL.startsWith('http')) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')
  }

  // 3. Déduire depuis la requête (pour les routes API)
  if (request) {
    try {
      const proto = request.headers.get('x-forwarded-proto') || 'https'
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
      if (host) {
        return `${proto}://${host}`
      }
    } catch {}
  }

  // 4. Fallback dev
  return 'http://localhost:10000'
}
