import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { processPendingComments, processCrmSequences } from '@/lib/automation'

// POST /api/automation/run - exécuter l'automatisation manuellement
export async function POST() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const [comments, sequences] = await Promise.all([
      processPendingComments(userId),
      processCrmSequences(userId),
    ])

    return NextResponse.json({
      success: true,
      data: {
        comments: `${comments.generated} réponses générées sur ${comments.processed} commentaires`,
        sequences: `${sequences.sent} messages de séquence générés`,
      },
    })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
