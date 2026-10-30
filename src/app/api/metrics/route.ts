import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { syncEngagementMetrics } from '@/lib/linkedin'
import { checkPlanFeature } from '@/lib/plans'

// ============================================================
// GET /api/metrics
// Retourne les analytics de l'utilisateur courant.
//
// - Si l'user a des EngagementMetric en base → on les renvoie
// - Sinon, on tente une sync LinkedIn (si compte connecté)
// - Si pas de compte LinkedIn → on renvoie un tableau vide
//   (le dashboard affichera l'état vide)
//
// Le nombre de jours retournés dépend du plan :
//   free: 14, pro: 90, business: 365
// ============================================================
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      // Non authentifié : retourner un tableau vide
      // (le dashboard public affichera un état "non connecté")
      return NextResponse.json({ success: true, data: [] })
    }

    // Déterminer la fenêtre d'analytics selon le plan
    const featCheck = await checkPlanFeature(userId, 'analyticsDays')
    const maxDays = typeof featCheck.value === 'number' ? featCheck.value : 14

    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - maxDays)
    const fromDateStr = fromDate.toISOString().split('T')[0]

    let metrics = await db.engagementMetric.findMany({
      where: { userId, date: { gte: fromDateStr } },
      orderBy: { date: 'asc' },
    })

    // Si pas de metrics en base, tenter une sync LinkedIn
    if (metrics.length === 0) {
      try {
        const syncResult = await syncEngagementMetrics(userId)
        if (syncResult.synced > 0) {
          metrics = await db.engagementMetric.findMany({
            where: { userId, date: { gte: fromDateStr } },
            orderBy: { date: 'asc' },
          })
        }
      } catch (e) {
        // Pas de compte LinkedIn ou sync échouée → on renvoie vide
        console.log('[GET /api/metrics] No LinkedIn sync:', (e as Error).message)
      }
    }

    return NextResponse.json({ success: true, data: metrics })
  } catch (error: any) {
    console.error('[METRICS ERROR]', error.message)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
