import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// GET /api/prospects/funnel
// Conversion funnel — counts per stage + conversion rates
//
// Returns:
//   {
//     stages: [{ stage, count, percentage }],
//     totalProspects,
//     conversionRate,  // won / total
//     stageTransitions: { new→contacted, contacted→replied, ... }
//   }
// ============================================================

const STAGES = ['new', 'contacted', 'replied', 'meeting', 'won', 'lost']

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    // Get all prospects grouped by stage
    const stageCounts = await db.prospect.groupBy({
      by: ['stage'],
      where: { userId },
      _count: true,
    })

    // Build the funnel
    const totalProspects = stageCounts.reduce((s, c) => s + c._count, 0)
    const stages = STAGES.map(stage => {
      const found = stageCounts.find(s => s.stage === stage)
      const count = found?._count || 0
      const percentage = totalProspects > 0 ? ((count / totalProspects) * 100).toFixed(1) : '0'
      return { stage, count, percentage: Number(percentage) }
    })

    // Conversion rates (stage N / stage N-1)
    const conversionRates: Record<string, number> = {}
    for (let i = 1; i < STAGES.length; i++) {
      const prevStage = STAGES[i - 1]
      const currStage = STAGES[i]
      const prevCount = stages.find(s => s.stage === prevStage)?.count || 0
      const currCount = stages.find(s => s.stage === currStage)?.count || 0
      if (prevStage === 'lost') continue // lost is not a progression
      conversionRates[`${prevStage}_to_${currStage}`] = prevCount > 0
        ? Number(((currCount / prevCount) * 100).toFixed(1))
        : 0
    }

    // Overall conversion rate (won / total non-lost)
    const wonCount = stages.find(s => s.stage === 'won')?.count || 0
    const lostCount = stages.find(s => s.stage === 'lost')?.count || 0
    const activeProspects = totalProspects - lostCount
    const conversionRate = activeProspects > 0
      ? Number(((wonCount / activeProspects) * 100).toFixed(1))
      : 0

    // Revenue from won prospects
    const wonRevenue = await db.revenueAttribution.aggregate({
      where: {
        userId,
        prospect: { stage: 'won' },
      },
      _sum: { amountCents: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        stages,
        totalProspects,
        conversionRate,
        conversionRates,
        wonCount,
        lostCount,
        wonRevenueCents: wonRevenue._sum.amountCents || 0,
        avgRevenuePerWon: wonCount > 0 ? Math.round((wonRevenue._sum.amountCents || 0) / wonCount) : 0,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/prospects/funnel]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
