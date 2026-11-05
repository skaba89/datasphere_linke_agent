import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { db } from '../../src/lib/db'

test('CRM message references and prospect cursors are tenant scoped', async ({ request }) => {
  const suffix = randomUUID()
  const cookies: string[] = []
  const userIds: string[] = []
  const prospectIds: string[] = []

  for (const tenant of ['a', 'b']) {
    const registration = await request.post('/api/auth/register', {
      data: {
        email: `crm-ownership-${tenant}-${suffix}@example.test`,
        password: 'Password123!',
        name: `CRM tenant ${tenant}`,
      },
    })
    expect(registration.status()).toBe(201)
    userIds.push((await registration.json()).data.id)
    const cookie = registration.headers()['set-cookie']
    expect(cookie).toBeTruthy()
    cookies.push(cookie.split(';')[0])
  }

  try {
    for (let i = 0; i < 2; i++) {
      const response = await request.post('/api/prospects', {
        headers: { Cookie: cookies[i] },
        data: { name: `CRM prospect ${i} ${suffix}`, company: 'Example business' },
      })
      expect(response.status()).toBe(201)
      prospectIds.push((await response.json()).data.id)
    }

    const foreignMessage = await request.post('/api/crm-messages', {
      headers: { Cookie: cookies[0] },
      data: {
        prospectId: prospectIds[1], subject: 'Forbidden cross-tenant message',
        body: 'Must not be stored',
      },
    })
    expect(foreignMessage.status()).toBe(404)
    expect(await db.crmMessage.count({
      where: { userId: userIds[0], prospectId: prospectIds[1] },
    })).toBe(0)

    const ownMessage = await request.post('/api/crm-messages', {
      headers: { Cookie: cookies[0] },
      data: { prospectId: prospectIds[0], subject: 'Private draft', body: 'Allowed only in own CRM' },
    })
    expect(ownMessage.status()).toBe(201)
    expect((await ownMessage.json()).data.status).toBe('draft')

    const foreignCursor = Buffer.from(prospectIds[1]).toString('base64url')
    // Cursor encoding follows the same encoding function as the live pagination API.
    const { encodeCursor } = await import('../../src/lib/pagination')
    const invalidPage = await request.get(`/api/prospects?cursor=${encodeURIComponent(encodeCursor(prospectIds[1]))}`, {
      headers: { Cookie: cookies[0] },
    })
    expect(invalidPage.status()).toBe(400)
    expect(await db.prospect.count({ where: { userId: userIds[1], id: prospectIds[1] } })).toBe(1)
  } finally {
    for (const userId of userIds) {
      await db.user.delete({ where: { id: userId } })
    }
    await db.$disconnect()
  }
})
