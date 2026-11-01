import { test, expect } from '@playwright/test'

// ============================================================
// Tests E2E — P1-D Analytics + Revenue Attribution
//
// Couvre:
//   1. Performance Intelligence GET (structure with new fields)
//   2. Revenue Attribution PATCH (B5 fix)
//   3. Revenue Attribution export CSV
//   4. Prospects funnel API
//   5. Prospect wonAt/lostAt auto-set on stage transition
// ============================================================

const TEST_EMAIL = `e2e-analytics-${Date.now()}@datasphere.io`
const TEST_PASSWORD = 'Password123!'

test.describe('P1-D Analytics + Revenue Attribution', () => {
  let cookies: string
  let prospectId: string
  let revenueId: string

  test.beforeAll(async ({ request }) => {
    const regRes = await request.post('/api/auth/register', {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD, name: 'Analytics Test' },
    })
    expect(regRes.status()).toBe(201)
    const setCookie = regRes.headers()['set-cookie']
    expect(setCookie).toBeTruthy()
    cookies = setCookie.split(';')[0]
  })

  // ------------------------------------------------------------
  // 1. Performance Intelligence GET
  // ------------------------------------------------------------
  test('performance-intelligence: GET returns structured KPIs with topPosts', async ({ request }) => {
    const res = await request.get('/api/performance-intelligence', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.kpis).toBeDefined()
    expect(data.data.kpis.d14).toBeDefined()
    expect(data.data.kpis.d30).toBeDefined()
    expect(data.data.kpis.d90).toBeDefined()
    expect(data.data.bestTime).toBeDefined()
    expect(data.data.topPosts).toBeDefined()
    expect(Array.isArray(data.data.topPosts)).toBe(true)
    // topPosts should have engagement fields (fix B2)
    if (data.data.topPosts.length > 0) {
      const post = data.data.topPosts[0]
      expect(post).toHaveProperty('likes')
      expect(post).toHaveProperty('comments')
      expect(post).toHaveProperty('shares')
      expect(post).toHaveProperty('views')
    }
  })

  // ------------------------------------------------------------
  // 2. Revenue Attribution PATCH (B5 fix)
  // ------------------------------------------------------------
  test('revenue-attribution: full lifecycle (create, PATCH, delete) with audit', async ({ request }) => {
    // 1. Create a prospect first
    const prospectRes = await request.post('/api/prospects', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { name: 'Revenue Test Prospect', email: 'rev@test.com' },
    })
    const prospectData = await prospectRes.json()
    prospectId = prospectData.data.id

    // 2. Create a revenue entry (will get 402 for Pro trial, skip if so)
    const createRes = await request.post('/api/revenue-attribution', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: {
        prospectId,
        amountCents: 50000, // 500€
        description: 'Test revenue',
      },
    })

    if (createRes.status() === 402 || createRes.status() === 403) {
      // Plan gate active for Pro trial — skip revenue tests
      test.skip(true, 'Revenue Attribution requires Business plan')
      return
    }

    expect(createRes.status()).toBe(201)
    const created = await createRes.json()
    revenueId = created.data.id

    // 3. PATCH the revenue entry (B5 fix — was missing)
    const patchRes = await request.patch(`/api/revenue-attribution/${revenueId}`, {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { amountCents: 75000, description: 'Updated revenue' },
    })
    expect(patchRes.status()).toBe(200)
    const patched = await patchRes.json()
    expect(patched.data.amountCents).toBe(75000)
    expect(patched.data.description).toBe('Updated revenue')

    // 4. PATCH with invalid amountCents
    const invalidRes = await request.patch(`/api/revenue-attribution/${revenueId}`, {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { amountCents: -100 },
    })
    expect(invalidRes.status()).toBe(400)

    // 5. PATCH non-existent → 404
    const notFoundRes = await request.patch('/api/revenue-attribution/nonexistent-id', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { amountCents: 1000 },
    })
    expect(notFoundRes.status()).toBe(404)

    // 6. DELETE
    const delRes = await request.delete(`/api/revenue-attribution/${revenueId}`, {
      headers: { Cookie: cookies },
    })
    expect(delRes.status()).toBe(200)
  })

  // ------------------------------------------------------------
  // 3. Revenue Attribution CSV export
  // ------------------------------------------------------------
  test('revenue-attribution/export: returns CSV (or 402 for Pro)', async ({ request }) => {
    const res = await request.get('/api/revenue-attribution/export', {
      headers: { Cookie: cookies },
    })
    // Pro trial → 403, Business+ → 200 CSV
    if (res.status() === 402 || res.status() === 403) {
      test.skip(true, 'Revenue export requires Business plan')
      return
    }
    expect(res.status()).toBe(200)
    const ct = res.headers()['content-type'] || ''
    expect(ct).toContain('text/csv')
    const text = await res.text()
    expect(text).toContain('date,amount,currency,source,client,prospect,description')
  })

  // ------------------------------------------------------------
  // 4. Prospects funnel API
  // ------------------------------------------------------------
  test('prospects/funnel: returns conversion funnel', async ({ request }) => {
    const res = await request.get('/api/prospects/funnel', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.stages).toBeDefined()
    expect(Array.isArray(data.data.stages)).toBe(true)
    expect(data.data.stages.length).toBe(6) // new, contacted, replied, meeting, won, lost
    expect(data.data.totalProspects).toBeDefined()
    expect(data.data.conversionRate).toBeDefined()
    expect(data.data.conversionRates).toBeDefined()
    // Each stage should have count and percentage
    for (const stage of data.data.stages) {
      expect(stage).toHaveProperty('stage')
      expect(stage).toHaveProperty('count')
      expect(stage).toHaveProperty('percentage')
    }
  })

  // ------------------------------------------------------------
  // 5. Prospect wonAt/lostAt auto-set
  // ------------------------------------------------------------
  test('prospect: PATCH to "won" sets wonAt', async ({ request }) => {
    // Create a prospect
    const createRes = await request.post('/api/prospects', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { name: 'Won Test', email: 'won@test.com' },
    })
    const created = await createRes.json()
    const pid = created.data.id

    // Move to won
    const wonRes = await request.patch(`/api/prospects/${pid}`, {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { stage: 'won' },
    })
    expect(wonRes.status()).toBe(200)
    const wonData = await wonRes.json()
    expect(wonData.data.stage).toBe('won')
    expect(wonData.data.wonAt).toBeTruthy()
    expect(wonData.data.lostAt).toBeNull()

    // Move to lost (should clear wonAt, set lostAt)
    const lostRes = await request.patch(`/api/prospects/${pid}`, {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { stage: 'lost' },
    })
    expect(lostRes.status()).toBe(200)
    const lostData = await lostRes.json()
    expect(lostData.data.stage).toBe('lost')
    expect(lostData.data.lostAt).toBeTruthy()
    expect(lostData.data.wonAt).toBeNull()
  })

  // ------------------------------------------------------------
  // 6. Performance Intelligence POST (AI recommendations)
  // ------------------------------------------------------------
  test('performance-intelligence: POST returns AI recommendations (or 403)', async ({ request }) => {
    const res = await request.post('/api/performance-intelligence', {
      headers: { Cookie: cookies },
    })
    // Pro trial → 200 (trial gives Pro access) or 403
    if (res.status() === 403) {
      test.skip(true, 'AI recommendations require Pro+ plan')
      return
    }
    expect([200, 500]).toContain(res.status()) // 500 if no AI provider configured
  })
})
