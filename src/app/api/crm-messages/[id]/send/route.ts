import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { logger } from '@/lib/logger'

// ============================================================
// POST /api/crm-messages/[id]/send
// Mark a CRM message (draft) as sent and update the prospect stage.
// Body: { }
// ============================================================

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { id } = await params

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
    if (message.status === 'sent') {
      return NextResponse.json({ success: false, error: 'Message déjà envoyé' }, { status: 400 })
    }

    const updated = await db.crmMessage.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date() },
    })

    // Update prospect stage (only regress from 'new' to 'contacted', B9 fix)
    const prospect = await db.prospect.findUnique({
      where: { id: message.prospectId },
      select: { id: true, stage: true },
    })
    if (prospect && prospect.stage === 'new') {
      await db.prospect.update({
        where: { id: message.prospectId },
        data: { stage: 'contacted' },
      })
    }

    logger.info({ userId, messageId: id, prospectId: message.prospectId }, 'CRM message marked as sent')

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('[POST /api/crm-messages/[id]/send]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
