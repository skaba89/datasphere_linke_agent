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
