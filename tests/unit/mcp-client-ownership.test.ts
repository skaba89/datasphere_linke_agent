import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findClient: vi.fn(),
  createPost: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    client: { findFirst: mocks.findClient },
    postProposal: { create: mocks.createPost },
  },
}))

import { findTool } from '@/lib/mcp-tools'

const createPost = (userId: string, clientId?: unknown) =>
  findTool('create_post')!.handler(userId, {
    title: 'Article LinkedIn',
    content: 'Contenu suffisamment long pour un brouillon LinkedIn.',
    ...(clientId === undefined ? {} : { clientId }),
  })

describe('MCP create_post cross-tenant isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createPost.mockResolvedValue({ id: 'post-1', status: 'pending' })
  })

  it('rejects a client owned by another user before creating a draft', async () => {
    mocks.findClient.mockResolvedValue(null)
    const response = await createPost('user-A', 'client-of-user-B')
    expect(response.isError).toBe(true)
    expect(response.content[0].text).toContain('non autorisé')
    expect(mocks.findClient).toHaveBeenCalledWith({
      where: { id: 'client-of-user-B', userId: 'user-A' },
      select: { id: true },
    })
    expect(mocks.createPost).not.toHaveBeenCalled()
  })

  it('rejects unknown client IDs without leaking existence', async () => {
    mocks.findClient.mockResolvedValue(null)
    const response = await createPost('user-A', 'missing')
    expect(response.isError).toBe(true)
    expect(response.content[0].text).toBe('Client introuvable ou non autorisé')
    expect(mocks.createPost).not.toHaveBeenCalled()
  })

  it('creates a pending draft for an owned client', async () => {
    mocks.findClient.mockResolvedValue({ id: 'my-client' })
    const response = await createPost('user-A', 'my-client')
    expect(response.isError).not.toBe(true)
    expect(mocks.createPost).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'user-A', clientId: 'my-client', status: 'pending',
      }),
    }))
  })

  it('keeps personal drafts working without clientId', async () => {
    const response = await createPost('user-A')
    expect(response.isError).not.toBe(true)
    expect(mocks.findClient).not.toHaveBeenCalled()
    expect(mocks.createPost).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'user-A', clientId: null, status: 'pending',
      }),
    }))
  })

  it.each([null, '', '   ', 123, {}])('rejects invalid clientId %s', async (clientId) => {
    // null intentionally retains the existing personal-draft behavior;
    // all other explicitly supplied invalid IDs must be refused.
    if (clientId === null) {
      const response = await createPost('user-A', clientId)
      expect(response.isError).not.toBe(true)
    } else {
      const response = await createPost('user-A', clientId)
      expect(response.isError).toBe(true)
      expect(mocks.createPost).not.toHaveBeenCalled()
    }
  })
})
