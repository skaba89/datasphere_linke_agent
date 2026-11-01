import { db } from '@/lib/db'

// ============================================================
// Audit Log Service
//
// Enregistre les actions sensibles effectuées par les admins
// pour traçabilité (qui a fait quoi, quand, depuis quelle IP).
//
// Actions typiques :
//   - user.ban / user.unban
//   - user.delete
//   - user.changePlan
//   - user.changeRole
//   - config.update
//   - api_key.revoke
//   - team.member_remove
// ============================================================

export interface AuditLogParams {
  actorId: string
  actorEmail: string
  action: string
  targetType?: string
  targetId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export async function logAuditAction(params: AuditLogParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actorId,
        actorEmail: params.actorEmail,
        action: params.action,
        targetType: params.targetType || null,
        targetId: params.targetId || null,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    })
  } catch (err) {
    // Audit log failure should NOT break the main operation
    console.error('[AuditLog] Failed to log action:', err)
  }
}

// ============================================================
// Helper : extract IP + user agent from request
// ============================================================
export function extractRequestInfo(request: Request): { ipAddress?: string; userAgent?: string } {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ipAddress = forwarded?.split(',')[0]?.trim() || realIp || undefined
  const userAgent = request.headers.get('user-agent') || undefined
  return { ipAddress, userAgent }
}
