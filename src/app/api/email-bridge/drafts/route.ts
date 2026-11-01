import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// GET /api/email-bridge/drafts
// Liste les PostProposals créés via l'Email-to-LinkedIn Bridge
// (angle='email-bridge')
// ============================================================

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const drafts = await db.postProposal.findMany({
      where: { userId, angle: 'email-bridge' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        content: true,
        hashtags: true,
        format: true,
        status: true,
        qualityScore: true,
        createdAt: true,
        publishedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: drafts })
  } catch (error: any) {
    console.error('[GET /api/email-bridge/drafts]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
