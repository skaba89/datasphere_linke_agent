import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { logAuditAction, extractRequestInfo } from '@/lib/audit-log'

// ============================================================
// PATCH /api/admin/users/[id]
// Modifie un user (plan, role)
// Body: { plan?: string, role?: string }
// ============================================================
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = await getCurrentUserId()
    if (!adminId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const admin = await db.user.findUnique({
      where: { id: adminId },
      select: { role: true, email: true },
    })
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin uniquement' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const allowedPlans = ['free', 'pro', 'business']
    const allowedRoles = ['user', 'admin']

    const data: any = {}
    const auditDetails: any = {}
    if (body.plan && allowedPlans.includes(body.plan)) {
      data.plan = body.plan
      auditDetails.newPlan = body.plan
    }
    if (body.role && allowedRoles.includes(body.role)) {
      data.role = body.role
      auditDetails.newRole = body.role
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: 'Rien à mettre à jour' }, { status: 400 })
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, plan: true, role: true },
    })

    // Audit log
    const { ipAddress, userAgent } = extractRequestInfo(request)
    const action = data.plan ? 'user.changePlan' : 'user.changeRole'
    await logAuditAction({
      actorId: adminId,
      actorEmail: admin.email,
      action,
      targetType: 'User',
      targetId: id,
      details: { ...auditDetails, targetEmail: updated.email },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('[PATCH /api/admin/users/[id]]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// ============================================================
// DELETE /api/admin/users/[id]
// Supprime un user (soft : plan=free + désactive)
// ============================================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = await getCurrentUserId()
    if (!adminId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const admin = await db.user.findUnique({
      where: { id: adminId },
      select: { role: true, email: true },
    })
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin uniquement' }, { status: 403 })
    }

    const { id } = await params

    // Ne pas se supprimer soi-même
    if (id === adminId) {
      return NextResponse.json({ success: false, error: 'Impossible de se supprimer soi-même' }, { status: 400 })
    }

    const targetUser = await db.user.findUnique({
      where: { id },
      select: { email: true },
    })

    await db.user.delete({ where: { id } })

    // Audit log
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await logAuditAction({
      actorId: adminId,
      actorEmail: admin.email,
      action: 'user.delete',
      targetType: 'User',
      targetId: id,
      details: { targetEmail: targetUser?.email },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/admin/users/[id]]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
