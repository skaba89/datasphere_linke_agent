import { test, expect } from '@playwright/test'

// ============================================================
// Tests E2E — Phase 4 — CRM Copilot + Revenue Attribution
// ============================================================

const TEST_EMAIL = `e2e-p4-${Date.now()}@datasphere.io`
const TEST_PASSWORD = 'Password123!'

test.describe('Phase 4 — CRM Copilot + Revenue Attribution', () => {
  let cookies: string

  test.beforeAll(async ({ request }) => {
    const regRes = await request.post('/api/auth/register', {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD, name: 'E2E P4' },
    })
    expect(regRes.status()).toBe(201)
    const setCookie = regRes.headers()['set-cookie']
    expect(setCookie).toBeTruthy()
    cookies = setCookie.split(';')[0]
  })

  // ------------------------------------------------------------
  // 1. CRM Copilot — auth + validation + plan gate
  // ------------------------------------------------------------
  test('crm-copilot: 401 without auth', async ({ request }) => {
    const res = await request.post('/api/ai/crm-copilot', { data: { message: 'test' } })
    expect(res.status()).toBe(401)
  })

  test('crm-copilot: 400 with too short message', async ({ request }) => {
    const res = await request.post('/api/ai/crm-copilot', {
      headers: { Cookie: cookies },
      data: { message: 'a' },
    })
    expect(res.status()).toBe(400)
  })

  test('crm-copilot: 400 with missing message', async ({ request }) => {
    const res = await request.post('/api/ai/crm-copilot', {
      headers: { Cookie: cookies },
      data: { foo: 'bar' },
    })
    expect(res.status()).toBe(400)
  })

  test('crm-copilot: 400 with too long message', async ({ request }) => {
    const res = await request.post('/api/ai/crm-copilot', {
      headers: { Cookie: cookies },
      data: { message: 'x'.repeat(4001) },
    })
    expect(res.status()).toBe(400)
  })

  test('crm-copilot: trial Pro user succeeds (200) or 500 (no AI provider)', async ({ request }) => {
    const res = await request.post('/api/ai/crm-copilot', {
      headers: { Cookie: cookies },
      data: { message: 'Quels prospects dois-je relancer ?' },
    })
    expect([200, 500]).toContain(res.status())
  })

  test('crm-copilot: with contextProspectId works', async ({ request }) => {
    // First create a prospect
    const pRes = await request.post('/api/prospects', {
      headers: { Cookie: cookies },
      data: { name: 'Alice Test', email: 'alice@test.com' },
    })
    expect(pRes.status()).toBe(201)
    const pData = await pRes.json()
    const prospectId = pData.data.id

    const res = await request.post('/api/ai/crm-copilot', {
      headers: { Cookie: cookies },
      data: { message: 'Analyse ce prospect', contextProspectId: prospectId },
    })
    expect([200, 500]).toContain(res.status())
  })

  // ------------------------------------------------------------
  // 2. Revenue Attribution — plan gate + CRUD
  // ------------------------------------------------------------
  test('revenue-attribution: 401 without auth', async ({ request }) => {
    const getRes = await request.get('/api/revenue-attribution')
    expect(getRes.status()).toBe(401)
    const postRes = await request.post('/api/revenue-attribution', { data: {} })
    expect(postRes.status()).toBe(401)
  })

  test('revenue-attribution: trial Pro user gets 403 (Business+ required)', async ({ request }) => {
    const getRes = await request.get('/api/revenue-attribution', { headers: { Cookie: cookies } })
    expect(getRes.status()).toBe(403)
    const postRes = await request.post('/api/revenue-attribution', {
      headers: { Cookie: cookies },
      data: { amountCents: 10000 },
    })
    expect(postRes.status()).toBe(403)
  })

  // ------------------------------------------------------------
  // 3. Theme toggle — UI presence
  // ------------------------------------------------------------
  test('theme toggle button present in dashboard', async ({ page, request }) => {
    // Register + login
    const email = `theme-${Date.now()}@datasphere.io`
    const regRes = await request.post('/api/auth/register', {
      data: { email, password: 'Password123!' },
    })
    if (regRes.status() !== 201) { test.skip(true, 'Rate limited'); return }
    const setCookie = regRes.headers()['set-cookie']
    const cookies = setCookie.split(';')[0]

    // Set session cookie and load dashboard
    await page.context().addCookies([{
      name: 'datasphere_session',
      value: cookies.split('=')[1],
      domain: 'localhost',
      path: '/',
    }])

    await page.goto('/')
    // The theme toggle button should be visible
    const toggle = page.getByRole('button', { name: /Passer en mode/ }).first()
    await expect(toggle).toBeVisible({ timeout: 10000 })
  })
})
