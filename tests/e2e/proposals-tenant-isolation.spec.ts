import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

// All requests target the isolated Playwright server and PostgreSQL test database.
test('proposal and demo seed endpoints enforce authentication and tenant isolation', async ({ request }) => {
  const suffix = randomUUID()
  const accounts: string[] = []
  for (const name of ['alpha', 'beta']) {
    const response = await request.post('/api/auth/register', {
      data: {
        email: `proposal-${name}-${suffix}@example.test`,
        password: 'Password123!',
        name: `Proposal ${name}`,
      },
    })
    expect(response.status()).toBe(201)
    const setCookie = response.headers()['set-cookie']
    expect(setCookie).toBeTruthy()
    accounts.push(setCookie.split(';')[0])
  }
  const [cookieA, cookieB] = accounts
  const titleA = `Tenant A ${suffix}`
  const titleB = `Tenant B ${suffix}`

  for (const [cookie, title] of [[cookieA, titleA], [cookieB, titleB]]) {
    const res = await request.post('/api/proposals', {
      headers: { Cookie: cookie },
      data: { title, content: 'Private LinkedIn draft for tenant-isolation test.' },
    })
    expect(res.status()).toBe(201)
    expect((await res.json()).data.status).toBe('pending')
  }

  // Explicit empty Cookie overrides the registration session in the shared Playwright API context.
  const publicList = await request.get('/api/proposals', { headers: { Cookie: '' } })
  expect(publicList.status()).toBe(401)
  const publicCreate = await request.post('/api/proposals', {
    headers: { Cookie: '' },
    data: { title: 'Unauthenticated', content: 'Should not be written.' },
  })
  expect(publicCreate.status()).toBe(401)
  const publicSeed = await request.post('/api/proposals/seed', { headers: { Cookie: '' } })
  expect(publicSeed.status()).toBe(401)

  const listA = await request.get('/api/proposals', { headers: { Cookie: cookieA } })
  expect(listA.status()).toBe(200)
  const resultA = await listA.json()
  expect(resultA.data.some((post: { title: string }) => post.title === titleA)).toBe(true)
  expect(resultA.data.some((post: { title: string }) => post.title === titleB)).toBe(false)

  const listB = await request.get('/api/proposals', { headers: { Cookie: cookieB } })
  expect(listB.status()).toBe(200)
  const resultB = await listB.json()
  expect(resultB.data.some((post: { title: string }) => post.title === titleB)).toBe(true)
  expect(resultB.data.some((post: { title: string }) => post.title === titleA)).toBe(false)

  const seed = await request.post('/api/proposals/seed', { headers: { Cookie: cookieA } })
  expect(seed.status()).toBe(200)

  const afterSeedB = await request.get('/api/proposals', { headers: { Cookie: cookieB } })
  expect(afterSeedB.status()).toBe(200)
  expect((await afterSeedB.json()).data.some((post: { title: string }) => post.title === titleB)).toBe(true)
})
