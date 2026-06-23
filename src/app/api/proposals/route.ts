import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    const where = userId ? { userId } : {}
    const proposals = await db.postProposal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: proposals })
  } catch (error) {
    console.error('Error fetching proposals:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch proposals' },
      { status: 500 },
    )
  }
}

// ============================================================
// POST /api/proposals
// Crée une nouvelle proposition de post (générée par IA ou manuelle)
// ============================================================
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await request.json()

    const required = ['title', 'content']
    for (const f of required) {
      if (!body[f]) {
        return NextResponse.json(
          { success: false, error: `Champ requis: ${f}` },
          { status: 400 }
        )
      }
    }

    const proposal = await db.postProposal.create({
      data: {
        userId: userId || null,
        title: body.title,
        content: body.content,
        hashtags: body.hashtags || '',
        format: body.format || 'text',
        angle: body.angle || '',
        targetAudience: body.targetAudience || '',
        qualityScore: typeof body.qualityScore === 'number' ? body.qualityScore : 0,
        optimalTime: body.optimalTime || '',
        engagementEst: body.engagementEst || '',
        status: body.status || 'pending',
      },
    })

    return NextResponse.json({ success: true, data: proposal }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/proposals]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
