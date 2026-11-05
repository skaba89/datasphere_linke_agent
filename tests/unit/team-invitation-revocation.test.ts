import { describe, expect, it, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  memberFindUnique: vi.fn(),
  invitationUpdateMany: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    teamMember: { findUnique: mocks.memberFindUnique },
    teamInvitation: { updateMany: mocks.invitationUpdateMany },
  },
}))

import { revokeInvitation } from '@/lib/teams'

describe('team invitation tenant isolation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('denies non-administrators before touching invitations', async () => {
    mocks.memberFindUnique.mockResolvedValue({ role: 'member' })
    await expect(revokeInvitation('team-a', 'user-a', 'invitation-b'))
      .rejects.toThrow('Permission refusée')
    expect(mocks.invitationUpdateMany).not.toHaveBeenCalled()
  })

  it('allows owner to revoke only a pending invitation from the same team', async () => {
    mocks.memberFindUnique.mockResolvedValue({ role: 'owner' })
    mocks.invitationUpdateMany.mockResolvedValue({ count: 1 })
    await expect(revokeInvitation('team-a', 'owner-a', 'invitation-a')).resolves.toBeUndefined()
    expect(mocks.invitationUpdateMany).toHaveBeenCalledWith({
      where: { id: 'invitation-a', teamId: 'team-a', status: 'pending' },
      data: { status: 'revoked' },
    })
  })

  it('rejects a foreign or already consumed invitation without a second write', async () => {
    mocks.memberFindUnique.mockResolvedValue({ role: 'admin' })
    mocks.invitationUpdateMany.mockResolvedValue({ count: 0 })
    await expect(revokeInvitation('team-a', 'admin-a', 'invitation-b'))
      .rejects.toThrow('Invitation introuvable ou non révocable.')
    expect(mocks.invitationUpdateMany).toHaveBeenCalledTimes(1)
  })
})
