import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  teamFindUnique: vi.fn(),
  invitationFindFirst: vi.fn(),
  invitationCreate: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: mocks.userFindUnique },
    team: { findUnique: mocks.teamFindUnique },
    teamInvitation: {
      findFirst: mocks.invitationFindFirst,
      create: mocks.invitationCreate,
    },
  },
}))

import { inviteMember } from '@/lib/teams'

describe('team invitations cannot escalate to owner', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.userFindUnique.mockResolvedValue(null)
    mocks.teamFindUnique.mockResolvedValue({ members: [{ userId: 'owner-a' }], invitations: [] })
    mocks.invitationFindFirst.mockResolvedValue(null)
    mocks.invitationCreate.mockResolvedValue({ id: 'invitation-new' })
  })

  it.each(['owner', 'superadmin', '', null, 123])(
    'rejects the invalid role %s before any database write',
    async (role) => {
      await expect(inviteMember('team-a', 'owner-a', 'invitee@example.test', role as never))
        .rejects.toThrow('Rôle d’invitation invalide')
      expect(mocks.invitationCreate).not.toHaveBeenCalled()
      expect(mocks.teamFindUnique).not.toHaveBeenCalled()
    },
  )

  it.each(['admin', 'member'] as const)(
    'creates an invitation with the allowed role %s',
    async (role) => {
      await inviteMember('team-a', 'owner-a', 'invitee@example.test', role)
      expect(mocks.invitationCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teamId: 'team-a',
          invitedById: 'owner-a',
          email: 'invitee@example.test',
          role,
        }),
      })
    },
  )
})
