import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { db } from '../../src/lib/db'
import { createApiKey } from '../../src/lib/api-keys'

// This suite uses ONLY the isolated Playwright PostgreSQL database.
// No LinkedIn token, external API or publication is involved.
test.describe('MCP HTTP — Business API key and draft safety', () => {
  let ownerId = ''
  let otherId = ''
  let ownedClientId = ''
  let foreignClientId = ''
  let apiKey = ''
  let otherApiKey = ''

  test.beforeAll(async () => {
    const suffix = randomUUID()
    const owner = await db.user.create({
      data: { email: `mcp-owner-${suffix}@example.test`, name: 'MCP owner', plan: 'business' },
    })
    ownerId = owner.id
    const other = await db.user.create({
      data: { email: `mcp-other-${suffix}@example.test`, name: 'MCP other', plan: 'business' },
    })
    otherId = other.id

    const owned = await db.client.create({ data: { userId: ownerId, name: 'Owned client' } })
    ownedClientId = owned.id
    const foreign = await db.client.create({ data: { userId: otherId, name: 'Foreign client' } })
    foreignClientId = foreign.id

    apiKey = (await createApiKey(ownerId, 'E2E MCP owner')).key
    otherApiKey = (await createApiKey(otherId, 'E2E MCP other')).key
  })

  test.afterAll(async () => {
    if (ownerId) await db.user.delete({ where: { id: ownerId } })
    if (otherId) await db.user.delete({ where: { id: otherId } })
    await db.$disconnect()
  })

  test('unauthenticated requests are denied', async ({ request }) => {
    const res = await request.post('/api/mcp', {
      data: { jsonrpc: '2.0', id: 1, method: 'initialize' },
    })
    expect(res.status()).toBe(401)
  })

  test('initialize and tools/list work with a real Business API key', async ({ request }) => {
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-11-25',
    }
    const init = await request.post('/api/mcp', {
      headers,
      data: { jsonrpc: '2.0', id: 1, method: 'initialize' },
    })
    expect(init.status()).toBe(200)
    const initBody = await init.json()
    expect(initBody.result.protocolVersion).toBe('2025-11-25')
    expect(initBody.result.serverInfo.name).toBe('datasphere-mcp')

    const list = await request.post('/api/mcp', {
      headers,
      data: { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    })
    expect(list.status()).toBe(200)
    const tools = (await list.json()).result.tools
    expect(tools.map((tool: { name: string }) => tool.name)).toContain('create_post')
    expect(tools.map((tool: { name: string }) => tool.name)).not.toContain('publish_post')
  })

  test('create_post creates pending draft, isolated by authenticated user', async ({ request }) => {
    const title = `MCP isolated draft ${randomUUID()}`
    const res = await request.post('/api/mcp', {
      headers: { Authorization: `Bearer ${apiKey}` },
      data: {
        jsonrpc: '2.0', id: 3, method: 'tools/call',
        params: { name: 'create_post', arguments: {
          title, content: 'Ceci est uniquement un brouillon MCP de test.',
          clientId: ownedClientId,
        } },
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.result.isError).toBe(false)
    const created = JSON.parse(body.result.content[0].text)
    expect(created.status).toBe('pending')

    const saved = await db.postProposal.findFirst({
      where: { id: created.id, userId: ownerId },
    })
    expect(saved?.title).toBe(title)
    expect(saved?.status).toBe('pending')
    expect(saved?.clientId).toBe(ownedClientId)
    expect(saved?.linkedinPostId).toBeFalsy()

    const otherList = await request.post('/api/mcp', {
      headers: { Authorization: `Bearer ${otherApiKey}` },
      data: { jsonrpc: '2.0', id: 4, method: 'tools/call',
        params: { name: 'get_post', arguments: { id: created.id } } },
    })
    expect(otherList.status()).toBe(200)
    expect((await otherList.json()).result.isError).toBe(true)
  })

  test('foreign client ID is rejected without creating a proposal', async ({ request }) => {
    const title = `MCP rejected draft ${randomUUID()}`
    const response = await request.post('/api/mcp', {
      headers: { Authorization: `Bearer ${apiKey}` },
      data: { jsonrpc: '2.0', id: 5, method: 'tools/call',
        params: { name: 'create_post', arguments: {
          title, content: 'Un brouillon ne doit pas appartenir à un client étranger.',
          clientId: foreignClientId,
        } } },
    })
    expect(response.status()).toBe(200)
    expect((await response.json()).result.isError).toBe(true)
    expect(await db.postProposal.count({ where: { title, userId: ownerId } })).toBe(0)
  })

  test('revoked API key cannot access MCP', async ({ request }) => {
    const temporaryKey = await createApiKey(ownerId, 'MCP revocation test')
    const candidate = await db.apiKey.findFirstOrThrow({
      where: { userId: ownerId, name: 'MCP revocation test' },
    })
    await db.apiKey.update({
      where: { id: candidate.id }, data: { revokedAt: new Date() },
    })
    const response = await request.post('/api/mcp', {
      headers: { Authorization: `Bearer ${temporaryKey.key}` },
      data: { jsonrpc: '2.0', id: 6, method: 'tools/list' },
    })
    expect(response.status()).toBe(401)
  })
})
