import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { db } from '../../src/lib/db'

test('agency client can link only an owned LinkedIn account', async ({ request }) => {
  const suffix = randomUUID()
  const ownerIds: string[] = []
  const cookies: string[] = []
  try {
    for (const tenant of ['owner', 'other']) {
      const response = await request.post('/api/auth/register', {
        data: {
          email: `agency-ownership-${tenant}-${suffix}@example.test`,
          password: 'Password123!',
          name: `Agency ${tenant}`,
        },
      })
      expect(response.status()).toBe(201)
      ownerIds.push((await response.json()).data.id)
      const cookie = response.headers()['set-cookie']
      expect(cookie).toBeTruthy()
      cookies.push(cookie.split(';')[0])
    }

    const ownAccount = await db.linkedInAccount.create({
      data: {
        userId: ownerIds[0], organizationId: `urn:li:person:own-${suffix}`,
        displayName: 'Owned test account', accessToken: 'test-only-not-a-real-token',
      },
    })
    const foreignAccount = await db.linkedInAccount.create({
      data: {
        userId: ownerIds[1], organizationId: `urn:li:person:foreign-${suffix}`,
        displayName: 'Foreign test account', accessToken: 'test-only-not-a-real-token',
      },
    })

    const clientResponse = await request.post('/api/clients', {
      headers: { Cookie: cookies[0] },
      data: { name: 'Agency client ownership test' },
    })
    expect(clientResponse.status()).toBe(201)
    const clientId = (await clientResponse.json()).data.id

    const foreign = await request.patch(`/api/clients/${clientId}`, {
      headers: { Cookie: cookies[0] },
      data: { linkedinAccountId: foreignAccount.id },
    })
    expect(foreign.status()).toBe(404)
    expect((await db.client.findUniqueOrThrow({ where: { id: clientId } })).linkedinAccountId).toBeNull()

    const owned = await request.patch(`/api/clients/${clientId}`, {
      headers: { Cookie: cookies[0] },
      data: { linkedinAccountId: ownAccount.id },
    })
    expect(owned.status()).toBe(200)
    expect((await db.client.findUniqueOrThrow({ where: { id: clientId } })).linkedinAccountId).toBe(ownAccount.id)

    const invalid = await request.patch(`/api/clients/${clientId}`, {
      headers: { Cookie: cookies[0] },
      data: { linkedinAccountId: '' },
    })
    expect(invalid.status()).toBe(400)

    const cleared = await request.patch(`/api/clients/${clientId}`, {
      headers: { Cookie: cookies[0] },
      data: { linkedinAccountId: null },
    })
    expect(cleared.status()).toBe(200)
    expect((await db.client.findUniqueOrThrow({ where: { id: clientId } })).linkedinAccountId).toBeNull()

    const foreignClientMutation = await request.patch(`/api/clients/${clientId}`, {
      headers: { Cookie: cookies[1] },
      data: { linkedinAccountId: foreignAccount.id },
    })
    expect(foreignClientMutation.status()).toBe(404)
  } finally {
    for (const id of ownerIds) {
      await db.user.delete({ where: { id } })
    }
    await db.$disconnect()
  }
})
