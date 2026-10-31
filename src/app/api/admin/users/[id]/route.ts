import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

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

    const admin = await db.user.findUnique({ where: { id: adminId }, select: { role: true } })
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin uniquement' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const allowedPlans = ['free', 'pro', 'business']
    const allowedRoles = ['user', 'admin']

    const data: any = {}
    if (body.plan && allowedPlans.includes(body.plan)) data.plan = body.plan
    if (body.role && allowedRoles.includes(body.role)) data.role = body.role

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: 'Rien à mettre à jour' }, { status: 400 })
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, plan: true, role: true },
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

    const admin = await db.user.findUnique({ where: { id: adminId }, select: { role: true } })
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin uniquement' }, { status: 403 })
    }

    const { id } = await params

    // Ne pas se supprimer soi-même
    if (id === adminId) {
      return NextResponse.json({ success: false, error: 'Impossible de se supprimer soi-même' }, { status: 400 })
    }

    await db.user.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/admin/users/[id]]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
