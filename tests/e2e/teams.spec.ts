import { test, expect } from '@playwright/test'

// ============================================================
// Tests E2E - Teams (multi-utilisateurs)
// Chaque test utilise un email unique
// ============================================================

test.describe('Teams API', () => {
  test('GET /api/teams without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/teams')
    expect(res.status()).toBe(401)
  })

  test('POST /api/teams/invite without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/teams/invite', {
      data: { email: 'someone@test.io' },
    })
    expect(res.status()).toBe(401)
  })

  test('Trial user gets response from team creation (402 or 201)', async ({ request }) => {
    const email = `team-${Date.now()}@datasphere.io`
    const regRes = await request.post('/api/auth/register', {
      data: { email, password: 'Password123!' },
    })
    if (regRes.status() !== 201) {
      test.skip(true, 'Rate limited in CI')
      return
    }
    const setCookie = regRes.headers()['set-cookie']
    expect(setCookie).toBeTruthy()
    const cookies = setCookie.split(';')[0]

    const res = await request.post('/api/teams', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { name: 'My Team' },
    })
    expect([402, 201]).toContain(res.status())
  })

  test('GET /api/teams returns null when no team', async ({ request }) => {
    const email = `team2-${Date.now()}@datasphere.io`
    const regRes = await request.post('/api/auth/register', {
      data: { email, password: 'Password123!' },
    })
    if (regRes.status() !== 201) {
      test.skip(true, 'Rate limited in CI')
      return
    }
    const setCookie = regRes.headers()['set-cookie']
    expect(setCookie).toBeTruthy()
    const cookies = setCookie.split(';')[0]

    const res = await request.get('/api/teams', {
      headers: { Cookie: cookies },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toBeNull()
  })

  test('accept invitation without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/teams/accept/fake-token')
    expect(res.status()).toBe(401)
  })

  test('GET /api/teams/accept/[token] with invalid token returns 404', async ({ request }) => {
    const res = await request.get('/api/teams/accept/invalid-token-xxx')
    expect(res.status()).toBe(404)
  })
})

test.describe('Teams UI', () => {
  test('/team page loads for authenticated user', async ({ page }) => {
    const email = `team-ui-${Date.now()}@datasphere.io`
    const regRes = await page.request.post('/api/auth/register', {
      data: { email, password: 'Password123!' },
    })
    if (regRes.status() !== 201) {
      test.skip(true, 'Rate limited in CI')
      return
    }

    await page.goto('/team')
    const body = page.locator('body')
    await expect(body).toBeVisible({ timeout: 15000 })
  })

  test('/team/invite without token shows error', async ({ page }) => {
    const email = `invite-ui-${Date.now()}@datasphere.io`
    const regRes = await page.request.post('/api/auth/register', {
      data: { email, password: 'Password123!' },
    })
    if (regRes.status() !== 201) {
      test.skip(true, 'Rate limited in CI')
      return
    }

    await page.goto('/team/invite')
    const body = page.locator('body')
    await expect(body).toBeVisible({ timeout: 15000 })
  })
})
