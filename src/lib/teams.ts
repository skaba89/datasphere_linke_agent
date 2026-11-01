import { db } from '@/lib/db'
import { randomBytes } from 'crypto'

// ============================================================
// Teams Service - Multi-utilisateurs (Plan Business)
//
// - createTeamForBusinessUser : auto-créée quand user upgrad à Business
// - inviteMember : envoie une invitation par email (token signé)
// - acceptInvitation : lie l'utilisateur à la team
// - getTeamWithMembers : liste l'équipe + membres + invitations pending
// - removeMember : retire un membre
// - transferOwnership : transfère la propriété
// ============================================================

export const INVITATION_EXPIRY_DAYS = 7
export const MAX_TEAM_MEMBERS = 5 // Plan Business : 5 sièges

export interface TeamWithMembers {
  id: string
  name: string
  ownerId: string
  plan: string
  createdAt: Date
  members: Array<{
    id: string
    userId: string
    role: string
    joinedAt: Date
    user: { id: string; email: string; name: string | null }
  }>
  pendingInvitations: Array<{
    id: string
    email: string
    role: string
    status: string
    expiresAt: Date
    createdAt: Date
  }>
}

// ============================================================
// Créer une team auto quand un user passe en Business
// ============================================================
export async function createTeamForBusinessUser(userId: string, userName?: string): Promise<string> {
  // Vérifier qu'une team n'existe pas déjà pour cet user
  const existing = await db.team.findFirst({ where: { ownerId: userId } })
  if (existing) return existing.id

  const team = await db.team.create({
    data: {
      name: userName ? `Équipe de ${userName}` : 'Mon équipe',
      ownerId: userId,
      plan: 'business',
    },
  })

  // Owner est automatiquement member avec role=owner
  await db.teamMember.create({
    data: {
      teamId: team.id,
      userId,
      role: 'owner',
    },
  })

  return team.id
}

// ============================================================
// Inviter un membre par email
// ============================================================
export async function inviteMember(
  teamId: string,
  invitedById: string,
  email: string,
  role: 'admin' | 'member' = 'member'
): Promise<{ invitationId: string; token: string; isNewUser: boolean }> {
  // Vérifier que l'invité n'est pas déjà membre
  const normalizedEmail = email.toLowerCase().trim()
  const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } })

  // Vérifier la limite de sièges
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: {
      members: true,
      invitations: { where: { status: 'pending' } },
    },
  })

  if (!team) throw new Error('Équipe introuvable')
  const totalSeats = team.members.length + team.invitations.length
  if (totalSeats >= MAX_TEAM_MEMBERS) {
    throw new Error(`Limite de ${MAX_TEAM_MEMBERS} sièges atteinte. Retirez un membre avant d'inviter.`)
  }

  // Vérifier qu'il n'y a pas déjà une invitation pending
  const existingPending = await db.teamInvitation.findFirst({
    where: { teamId, email: normalizedEmail, status: 'pending' },
  })
  if (existingPending) {
    throw new Error('Une invitation est déjà en attente pour cet email.')
  }

  // Si user existe déjà et est déjà member → erreur
  if (existingUser) {
    const alreadyMember = await db.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: existingUser.id } },
    })
    if (alreadyMember) {
      throw new Error('Cet utilisateur est déjà membre de l\'équipe.')
    }
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

  const invitation = await db.teamInvitation.create({
    data: {
      teamId,
      email: normalizedEmail,
      token,
      role,
      invitedById,
      invitedUserId: existingUser?.id || null,
      expiresAt,
    },
  })

  return {
    invitationId: invitation.id,
    token,
    isNewUser: !existingUser,
  }
}

// ============================================================
// Accepter une invitation
// ============================================================
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ teamId: string; teamName: string }> {
  const invitation = await db.teamInvitation.findUnique({
    where: { token },
    include: { team: true },
  })

  if (!invitation) {
    throw new Error('Invitation introuvable ou token invalide.')
  }

  if (invitation.status !== 'pending') {
    throw new Error(`Invitation déjà ${invitation.status}.`)
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    await db.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: 'declined' },
    })
    throw new Error('Invitation expirée.')
  }

  // Vérifier que le user correspond bien à l'email invité
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || user.email !== invitation.email) {
    throw new Error('Cette invitation n\'est pas pour votre compte.')
  }

  // Transaction : créer le membership + marquer invitation accepted
  await db.$transaction([
    db.teamMember.create({
      data: {
        teamId: invitation.teamId,
        userId,
        role: invitation.role,
      },
    }),
    db.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted', acceptedAt: new Date(), invitedUserId: userId },
    }),
  ])

  return { teamId: invitation.teamId, teamName: invitation.team.name }
}

// ============================================================
// Récupérer la team d'un user (avec members + invitations pending)
// ============================================================
export async function getTeamWithMembers(userId: string): Promise<TeamWithMembers | null> {
  // Trouver la team où l'user est member
  const membership = await db.teamMember.findFirst({
    where: { userId },
    include: { team: { include: { members: { include: { user: true } }, invitations: true } } },
  })

  if (!membership) return null

  const team = membership.team
  return {
    id: team.id,
    name: team.name,
    ownerId: team.ownerId,
    plan: team.plan,
    createdAt: team.createdAt,
    members: team.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      user: {
        id: m.user.id,
        email: m.user.email,
        name: m.user.name,
      },
    })),
    pendingInvitations: team.invitations
      .filter((i) => i.status === 'pending')
      .map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        status: i.status,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })),
  }
}

// ============================================================
// Retirer un membre
// ============================================================
export async function removeMember(
  teamId: string,
  requesterId: string,
  memberUserId: string
): Promise<void> {
  // Vérifier que le requester est owner ou admin
  const requesterMembership = await db.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: requesterId } },
  })
  if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role)) {
    throw new Error('Vous n\'avez pas la permission de retirer des membres.')
  }

  // Impossible de retirer l'owner
  const team = await db.team.findUnique({ where: { id: teamId } })
  if (team?.ownerId === memberUserId) {
    throw new Error('Vous ne pouvez pas retirer le propriétaire de l\'équipe.')
  }

  await db.teamMember.delete({
    where: { teamId_userId: { teamId, userId: memberUserId } },
  })
}

// ============================================================
// Annuler une invitation (si pending)
// ============================================================
export async function revokeInvitation(
  teamId: string,
  requesterId: string,
  invitationId: string
): Promise<void> {
  const requesterMembership = await db.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: requesterId } },
  })
  if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role)) {
    throw new Error('Permission refusée.')
  }

  await db.teamInvitation.update({
    where: { id: invitationId },
    data: { status: 'revoked' },
  })
}

// ============================================================
// L'user a-t-il une team ?
// ============================================================
export async function getUserTeam(userId: string) {
  const membership = await db.teamMember.findFirst({
    where: { userId },
    include: { team: true },
  })
  return membership?.team || null
}

// ============================================================
// CLIENT ASSIGNMENTS — permissions granulaires par client
// ============================================================
// Niveaux de permission :
//   view   — voir les posts/CRM du client (read-only)
//   edit   — créer/modifier posts + CRM, mais pas publier
//   manage — tout, y compris publication et suppression
// Les owners/admins de la team ont automatiquement "manage" sur tous les clients.

export type ClientPermission = 'view' | 'edit' | 'manage'

export interface ClientAssignmentWithDetails {
  id: string
  clientId: string
  clientName: string
  teamMemberId: string
  memberEmail: string
  memberName: string | null
  permission: ClientPermission
  assignedAt: Date
}

// Récupérer toutes les assignments d'une team (via les clients du owner)
export async function listClientAssignments(ownerUserId: string): Promise<ClientAssignmentWithDetails[]> {
  const assignments = await db.clientAssignment.findMany({
    where: { client: { userId: ownerUserId } },
    include: {
      client: { select: { id: true, name: true } },
      teamMember: { include: { user: { select: { id: true, email: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return assignments.map(a => ({
    id: a.id,
    clientId: a.clientId,
    clientName: a.client.name,
    teamMemberId: a.teamMemberId,
    memberEmail: a.teamMember.user.email,
    memberName: a.teamMember.user.name,
    permission: a.permission as ClientPermission,
    assignedAt: a.createdAt,
  }))
}

// Assigner un client à un membre de la team
export async function assignClientToMember(params: {
  ownerUserId: string
  clientId: string
  teamMemberId: string
  permission: ClientPermission
}): Promise<{ id: string; isNew: boolean }> {
  const { ownerUserId, clientId, teamMemberId, permission } = params

  // Verify the client belongs to the owner
  const client = await db.client.findFirst({ where: { id: clientId, userId: ownerUserId } })
  if (!client) throw new Error('Client introuvable ou non autorisé')

  // Verify the team member belongs to a team owned by the owner
  const member = await db.teamMember.findFirst({
    where: { id: teamMemberId },
    include: { team: true },
  })
  if (!member || member.team.ownerId !== ownerUserId) {
    throw new Error('Membre introuvable ou non autorisé')
  }

  // Upsert assignment
  const existing = await db.clientAssignment.findUnique({
    where: { clientId_teamMemberId: { clientId, teamMemberId } },
  })
  if (existing) {
    const updated = await db.clientAssignment.update({
      where: { id: existing.id },
      data: { permission, assignedById: ownerUserId },
    })
    return { id: updated.id, isNew: false }
  }
  const created = await db.clientAssignment.create({
    data: { clientId, teamMemberId, permission, assignedById: ownerUserId },
  })
  return { id: created.id, isNew: true }
}

// Retirer une assignation
export async function removeClientAssignment(ownerUserId: string, assignmentId: string): Promise<void> {
  const assignment = await db.clientAssignment.findUnique({
    where: { id: assignmentId },
    include: { client: { select: { userId: true } } },
  })
  if (!assignment) throw new Error('Assignation introuvable')
  if (assignment.client.userId !== ownerUserId) throw new Error('Non autorisé')
  await db.clientAssignment.delete({ where: { id: assignmentId } })
}

// Vérifier la permission d'un user sur un client donné
// Retourne la permission effectivement applicable (ou null si aucun accès)
export async function getUserClientPermission(
  userId: string,
  clientId: string
): Promise<ClientPermission | null> {
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { userId: true },
  })
  if (!client) return null

  // Owner du client → manage
  if (client.userId === userId) return 'manage'

  // Chercher la membership team du user et l'assignment correspondant
  const membership = await db.teamMember.findFirst({
    where: { userId },
    include: { team: true },
  })
  if (!membership) return null

  // Owner/admin de la team qui possède le client → manage
  if (membership.role === 'owner' || membership.role === 'admin') {
    // S'assurer que la team du user est bien celle du client (via owner)
    if (membership.team.ownerId === client.userId) return 'manage'
  }

  // Sinon, chercher une assignment explicite
  const assignment = await db.clientAssignment.findUnique({
    where: { clientId_teamMemberId: { clientId, teamMemberId: membership.id } },
  })
  return (assignment?.permission as ClientPermission) || null
}

// Lister les clients accessibles par un user (propriétaire + assignés)
export async function listAccessibleClients(userId: string): Promise<Array<{
  id: string
  name: string
  color: string
  active: boolean
  permission: ClientPermission
  assignedViaTeamMemberId?: string
}>> {
  // 1. Clients possédés
  const owned = await db.client.findMany({
    where: { userId },
    select: { id: true, name: true, color: true, active: true },
  })
  const result: Array<{
    id: string
    name: string
    color: string
    active: boolean
    permission: ClientPermission
    assignedViaTeamMemberId?: string
  }> = owned.map(c => ({ ...c, permission: 'manage' as ClientPermission }))

  // 2. Clients assignés via team membership
  const membership = await db.teamMember.findFirst({
    where: { userId },
    select: { id: true, role: true, team: { select: { ownerId: true } } },
  })
  if (membership) {
    // Owner/admin → tous les clients du team owner
    if (membership.role === 'owner' || membership.role === 'admin') {
      const teamClients = await db.client.findMany({
        where: { userId: membership.team.ownerId },
        select: { id: true, name: true, color: true, active: true },
      })
      for (const c of teamClients) {
        if (!result.find(r => r.id === c.id)) {
          result.push({ ...c, permission: 'manage' })
        }
      }
    } else {
      // Membre simple → seulement les clients assignés explicitement
      const assignments = await db.clientAssignment.findMany({
        where: { teamMemberId: membership.id },
        include: { client: { select: { id: true, name: true, color: true, active: true } } },
      })
      for (const a of assignments) {
        if (!result.find(r => r.id === a.client.id)) {
          result.push({
            id: a.client.id,
            name: a.client.name,
            color: a.client.color,
            active: a.client.active,
            permission: a.permission as ClientPermission,
            assignedViaTeamMemberId: membership.id,
          })
        }
      }
    }
  }

  return result
}
