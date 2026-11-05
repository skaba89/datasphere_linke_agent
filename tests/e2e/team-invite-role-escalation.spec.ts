import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { db } from '../../src/lib/db'

test('teams API rejects owner role escalation via forged invitation JSON', async ({ request }) => {
  const email = `team-role-${randomUUID()}@example.test`
  const registration = await request.post('/api/auth/register', {
    data: { email, password: 'Password123!', name: 'Invitation role test' },
  })
  expect(registration.status()).toBe(201)
  const userId = (await registration.json()).data.id
  const cookie = registration.headers()['set-cookie']?.split(';')[0]
  expect(cookie).toBeTruthy()

  try {
    await db.user.update({
      where: { id: userId },
      data: { plan: 'business', trialEndsAt: null },
    })
    const team = await request.post('/api/teams', {
      headers: { Cookie: cookie! },
      data: { name: 'Role-isolation team' },
    })
    expect(team.status()).toBe(201)

    for (const role of ['owner', 'superadmin', null, 1]) {
      const invalid = await request.post('/api/teams/invite', {
        headers: { Cookie: cookie! },
        data: { email: `invitee-${randomUUID()}@example.test`, role },
      })
      expect(invalid.status()).toBe(400)
    }

    const teamId = (await team.json()).data.id
    expect(await db.teamInvitation.count({ where: { teamId } })).toBe(0)
  } finally {
    await db.user.delete({ where: { id: userId } })
    await db.$disconnect()
  }
})
