import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { calculateMonthlyPayouts } from '@/lib/affiliate'
import { verifyCronAuth, getCronSecret } from '@/lib/cron-secret'

// ============================================================
// GET /api/cron/payouts
// Cron mensuel (1er du mois à 9h UTC) qui calcule les payouts
// des affiliates dont le solde >= 50€.
//
// ⚠️ Protégé par CRON_SECRET (ou dérivé de JWT_SECRET automatiquement)
// ============================================================
export async function GET(request: Request) {
  const secret = getCronSecret()
  if (!secret) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (!verifyCronAuth(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  logger.info({ route: 'cron/payouts' }, 'Cron payouts started')

  try {
    const result = await calculateMonthlyPayouts()

    const durationMs = Date.now() - startTime
    logger.info({
      route: 'cron/payouts',
      usersPaid: result.usersPaid,
      totalAmount: result.totalAmount,
      durationMs,
    }, 'Cron payouts done')

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        amountFormatted: `${(result.totalAmount / 100).toFixed(2)}€`,
        durationMs,
      },
    })
  } catch (err: any) {
    logger.error({ err: err.message, route: 'cron/payouts' }, 'Cron payouts failed')
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
