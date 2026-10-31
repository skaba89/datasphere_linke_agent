import { test, expect } from '@playwright/test'

// ============================================================
// Tests E2E - Public pages + Health
// ============================================================

test.describe('Public pages', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/DataSphere/i)
  })

  test('pricing page loads with 3 plans', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.locator('text=Free')).toBeVisible()
    await expect(page.getByText('Pro', { exact: true }).first()).toBeVisible()
    await expect(page.locator('text=Business')).toBeVisible()
  })

  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Connexion', { exact: true })).toBeVisible()
  })

  test('register page loads', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByText('Créer un compte', { exact: true })).toBeVisible()
  })

  test('onboarding redirects to /login if unauthenticated', async ({ page }) => {
    await page.goto('/onboarding')
    await page.waitForURL('**/login**', { timeout: 10000 })
    expect(page.url()).toContain('/login')
  })

  test('legal pages load', async ({ page }) => {
    await page.goto('/legal/terms')
    await expect(page.locator('h1')).toContainText('Conditions Générales')

    await page.goto('/legal/privacy')
    await expect(page.locator('h1')).toContainText('Politique de confidentialité')

    await page.goto('/legal/notice')
    await expect(page.locator('h1')).toContainText('Mentions légales')
  })
})

test.describe('Health check', () => {
  test('GET /api/health returns 200 with database ok', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data.database?.status).toBe('ok')
  })
})

test.describe('Middleware protection', () => {
  test('/onboarding without auth redirects to /login', async ({ request }) => {
    const res = await request.get('/onboarding', {
      maxRedirects: 0,
    })
    expect([307, 308]).toContain(res.status())
    const location = res.headers()['location']
    expect(location).toContain('/login')
    expect(location).toContain('redirect=')
  })

  test('/team without auth redirects to /login', async ({ request }) => {
    const res = await request.get('/team', { maxRedirects: 0 })
    expect([307, 308]).toContain(res.status())
    expect(res.headers()['location']).toContain('/login')
  })

  test('/login with valid auth redirects to /', async ({ request }) => {
    // Register (set cookie)
    const email = `mw-${Date.now()}@datasphere.io`
    const regRes = await request.post('/api/auth/register', {
      data: { email, password: 'Password123!' },
    })
    expect(regRes.status()).toBe(201)
    const cookies = regRes.headers()['set-cookie'].split(';')[0]

    // Aller sur /login avec le cookie → doit rediriger vers /
    const res = await request.get('/login', {
      headers: { Cookie: cookies },
      maxRedirects: 0,
    })
    expect([307, 308]).toContain(res.status())
    expect(res.headers()['location']).toBe('http://localhost:10000/')
  })
})

test.describe('Rate limiting', () => {
  test('login enforces rate limit after 5 failed attempts', async ({ request }) => {
    const email = `rl-${Date.now()}@datasphere.io`
    await request.post('/api/auth/register', {
      data: { email, password: 'Password123!' },
    })

    // 5 tentatives échouées
    for (let i = 0; i < 5; i++) {
      await request.post('/api/auth/login', {
        data: { email, password: 'wrong' },
      })
    }

    // 6e tentative doit être 429
    const res = await request.post('/api/auth/login', {
      data: { email, password: 'wrong' },
    })
    expect(res.status()).toBe(429)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('tentatives')
  })
})
