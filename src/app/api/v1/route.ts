import { NextResponse } from 'next/server'

// ============================================================
// GET /api/v1
// Documentation de l'API publique DataSphere
// ============================================================
export async function GET() {
  return NextResponse.json({
    name: 'DataSphere Public API',
    version: '1.0.0',
    description: 'API REST pour intégrer DataSphere à vos outils.',
    baseUrl: '/api/v1',
    authentication: {
      type: 'Bearer',
      header: 'Authorization: Bearer dsk_live_XXX',
      description: 'Créez une clé API depuis /settings (plan Business requis)',
    },
    rateLimit: {
      limit: 60,
      window: '1 minute',
      headers: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    },
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/posts',
        description: 'Liste vos propositions de posts',
        params: ['status', 'limit (max 100)', 'offset'],
        example: 'curl -H "Authorization: Bearer dsk_live_XXX" https://VOTRE-APP.onrender.com/api/v1/posts?status=approved&limit=20',
      },
      {
        method: 'POST',
        path: '/api/v1/posts',
        description: 'Crée une nouvelle proposition',
        body: '{ title, content, hashtags?, format?, angle? }',
      },
      {
        method: 'GET',
        path: '/api/v1/stats',
        description: 'Statistiques agrégées (likes, comments, vues...)',
        params: ['days (1-365 selon plan)'],
      },
    ],
    errors: {
      401: 'API key invalide ou manquante',
      402: 'Plan Business requis',
      429: 'Rate limit exceeded',
      500: 'Erreur serveur',
    },
    sdk: 'npm install @datasphere/sdk (à venir)',
  })
}
