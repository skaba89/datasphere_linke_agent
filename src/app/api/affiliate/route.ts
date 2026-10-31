import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getAffiliateStats, ensureReferralCode } from '@/lib/affiliate'

// ============================================================
// GET /api/affiliate
// Récupère les stats d'affiliation de l'utilisateur courant
// ============================================================
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // S'assurer qu'un code existe
    await ensureReferralCode(userId)
    const stats = await getAffiliateStats(userId)

    return NextResponse.json({ success: true, data: stats })
  } catch (error: any) {
    console.error('[GET /api/affiliate]', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
