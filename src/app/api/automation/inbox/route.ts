import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { generateOutreachMessage } from '@/lib/automation'

// POST /api/automation/inbox - générer un message pour un prospect
// Body: { prospectId, type: 'first_contact' | 'follow_up' | 're_engage' }
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { prospectId, type } = await request.json()
    if (!prospectId) return NextResponse.json({ success: false, error: 'prospectId requis' }, { status: 400 })

    const prospect = await db.prospect.findFirst({ where: { id: prospectId, userId } })
    if (!prospect) return NextResponse.json({ success: false, error: 'Prospect introuvable' }, { status: 404 })

    const settings = await db.smartPosterSettings.findUnique({ where: { userId }, select: { topics: true } })

    const message = await generateOutreachMessage({
      prospectName: prospect.name,
      prospectTitle: prospect.title || undefined,
      prospectCompany: prospect.company || undefined,
      userContext: settings?.topics || 'Marketing digital et IA',
      connectionType: type || 'first_contact',
    })

    // Sauvegarder en DB
    const crmMessage = await db.crmMessage.create({
      data: {
        userId, prospectId: prospect.id,
        subject: type === 'follow_up' ? 'Relance' : 'Premier contact',
        body: message, status: 'draft',
      },
    })

    // Mettre à jour le stage du prospect
    if (type === 'first_contact' && prospect.stage === 'new') {
      await db.prospect.update({ where: { id: prospect.id }, data: { stage: 'contacted' } })
    }

    return NextResponse.json({ success: true, data: { message, crmMessageId: crmMessage.id } })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
