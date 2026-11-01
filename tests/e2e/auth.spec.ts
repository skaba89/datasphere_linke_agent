import { test, expect } from '@playwright/test'

// ============================================================
// Tests E2E - Authentification
// Chaque test utilise un email unique (pas de state partagé)
// ============================================================

test.describe('Authentication', () => {
  test('register → me → logout flow', async ({ request }) => {
    const email = `e2e-${Date.now()}@datasphere.io`
    const password = 'Password123!'

    const regRes = await request.post('/api/auth/register', {
      data: { email, password, name: 'E2E Test User' },
    })
    expect(regRes.status()).toBe(201)
    const regData = await regRes.json()
    expect(regData.success).toBe(true)
    expect(regData.data.email).toBe(email)
    expect(regData.data.plan).toBe('pro')
    expect(regData.data.trialEndsAt).toBeTruthy()

    const cookies = regRes.headers()['set-cookie']
    expect(cookies).toContain('datasphere_session=')

    const meRes = await request.get('/api/auth/me', {
      headers: { Cookie: cookies.split(';')[0] },
    })
    expect(meRes.status()).toBe(200)
    const meData = await meRes.json()
    expect(meData.data.email).toBe(email)
    expect(meData.data.trialActive).toBe(true)

    const logoutRes = await request.post('/api/auth/logout', {
      headers: { Cookie: cookies.split(';')[0] },
    })
    expect(logoutRes.status()).toBe(200)
    const logoutData = await logoutRes.json()
    expect(logoutData.success).toBe(true)
  })

  test('login with wrong password returns 401', async ({ request }) => {
    const email = `login-wrong-${Date.now()}@datasphere.io`
    await request.post('/api/auth/register', {
      data: { email, password: 'Password123!' },
    })

    const res = await request.post('/api/auth/login', {
      data: { email, password: 'wrongpassword' },
    })
    expect(res.status()).toBe(401)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Identifiants invalides')
  })

  test('login with correct password succeeds', async ({ request }) => {
    const email = `login-ok-${Date.now()}@datasphere.io`
    await request.post('/api/auth/register', {
      data: { email, password: 'Password123!' },
    })

    const res = await request.post('/api/auth/login', {
      data: { email, password: 'Password123!' },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.email).toBe(email)
  })

  test('register with invalid email returns 400', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { email: 'invalid', password: 'Password123!' },
    })
    expect(res.status()).toBe(400)
  })

  test('register with short password returns 400', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: { email: `short-${Date.now()}@datasphere.io`, password: 'short' },
    })
    expect(res.status()).toBe(400)
  })

  test('register same email twice returns 409', async ({ request }) => {
    const email = `dup-${Date.now()}@datasphere.io`
    const user = { email, password: 'Password123!', name: 'Dup' }

    const res1 = await request.post('/api/auth/register', { data: user })
    expect(res1.status()).toBe(201)

    const res2 = await request.post('/api/auth/register', { data: user })
    expect(res2.status()).toBe(409)
  })
})

test.describe('UI Auth flow', () => {
  test('register page works', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('h2')).toContainText('Créer un compte')

    await page.fill('[id="name"]', 'Playwright User')
    await page.fill('[id="email"]', `ui-test-${Date.now()}@datasphere.io`)
    await page.fill('[id="password"]', 'Password123!')

    await page.click('button[type="submit"]')

    // Devrait rediriger vers /onboarding
    await page.waitForURL('**/onboarding', { timeout: 15000 })
    expect(page.url()).toContain('/onboarding')
  })

  test('login page works', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h2')).toContainText('Connexion')
  })
})
