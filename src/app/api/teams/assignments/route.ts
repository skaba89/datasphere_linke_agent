import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { listClientAssignments, assignClientToMember, removeClientAssignment, type ClientPermission } from '@/lib/teams'

// ============================================================
// /api/teams/assignments
//
// GET    — list all client assignments for the calling user (owner only)
// POST   — assign a client to a team member with a permission level
//          Body: { clientId, teamMemberId, permission: 'view' | 'edit' | 'manage' }
// DELETE — revoke an assignment
//          Body: { assignmentId }
// ============================================================

const VALID_PERMISSIONS: ClientPermission[] = ['view', 'edit', 'manage']

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const assignments = await listClientAssignments(userId)
    return NextResponse.json({ success: true, data: assignments })
  } catch (error: any) {
    console.error('[GET /api/teams/assignments]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { clientId, teamMemberId, permission } = body

    if (!clientId || !teamMemberId) {
      return NextResponse.json({ success: false, error: 'clientId et teamMemberId requis' }, { status: 400 })
    }
    if (!VALID_PERMISSIONS.includes(permission)) {
      return NextResponse.json(
        { success: false, error: `permission invalide (doit être parmi: ${VALID_PERMISSIONS.join(', ')})` },
        { status: 400 }
      )
    }

    const result = await assignClientToMember({
      ownerUserId: userId,
      clientId,
      teamMemberId,
      permission,
    })
    return NextResponse.json({
      success: true,
      data: { id: result.id, isNew: result.isNew },
    }, { status: result.isNew ? 201 : 200 })
  } catch (error: any) {
    console.error('[POST /api/teams/assignments]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('id')
    if (!assignmentId) {
      return NextResponse.json({ success: false, error: 'Paramètre id requis' }, { status: 400 })
    }

    await removeClientAssignment(userId, assignmentId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/teams/assignments]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
