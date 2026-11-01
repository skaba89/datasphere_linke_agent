import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// POST /api/crm-messages/[id]/reply
// Mark a sent message as replied (or bounced)
//
// Body: { status: 'replied' | 'bounced' }
// Sets repliedAt, advances prospect stage to 'replied' (only if currently 'contacted')
// ============================================================

const VALID_REPLY_STATUSES = ['replied', 'bounced']

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!VALID_REPLY_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `status invalide. Autorisés: ${VALID_REPLY_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const message = await db.crmMessage.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true, prospectId: true },
    })

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message introuvable' }, { status: 404 })
    }
    if (message.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    }
    if (message.status !== 'sent') {
      return NextResponse.json(
        { success: false, error: 'Seuls les messages envoyés peuvent être marqués comme répondus' },
        { status: 400 }
      )
    }

    const updated = await db.crmMessage.update({
      where: { id },
      data: { status, repliedAt: new Date() },
    })

    // Advance prospect stage to 'replied' (B9 fix — only if currently 'contacted')
    if (status === 'replied' && message.prospectId) {
      const prospect = await db.prospect.findUnique({
        where: { id: message.prospectId },
        select: { id: true, stage: true },
      })
      if (prospect && prospect.stage === 'contacted') {
        await db.prospect.update({
          where: { id: prospect.id },
          data: { stage: 'replied' },
        })
      }
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('[POST /api/crm-messages/[id]/reply]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
