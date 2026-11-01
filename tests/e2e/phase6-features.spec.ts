import { test, expect } from '@playwright/test'

// ============================================================
// Tests E2E — Phase 6 — Pagination + SSE + Cache headers
// ============================================================

const TEST_EMAIL = `e2e-p6-${Date.now()}@datasphere.io`
const TEST_PASSWORD = 'Password123!'

test.describe('Phase 6 — Pagination cursor-based + SSE + Cache headers', () => {
  let cookies: string

  test.beforeAll(async ({ request }) => {
    const regRes = await request.post('/api/auth/register', {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD, name: 'E2E P6' },
    })
    expect(regRes.status()).toBe(201)
    const setCookie = regRes.headers()['set-cookie']
    expect(setCookie).toBeTruthy()
    cookies = setCookie.split(';')[0]
  })

  // ------------------------------------------------------------
  // 1. Cursor-based pagination — proposals
  // ------------------------------------------------------------
  test('proposals: returns pagination metadata (data, nextCursor, hasMore)', async ({ request }) => {
    const res = await request.get('/api/proposals?limit=5', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    expect(typeof data.hasMore).toBe('boolean')
    // nextCursor should be null or a string
    expect(data.nextCursor === null || typeof data.nextCursor === 'string').toBe(true)
  })

  test('proposals: limit clamped to max 100', async ({ request }) => {
    const res = await request.get('/api/proposals?limit=999', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    // Even with limit=999, should return at most 100 items
    expect(data.data.length).toBeLessThanOrEqual(100)
  })

  test('proposals: status filter works', async ({ request }) => {
    const res = await request.get('/api/proposals?status=pending', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    // All returned items should have status=pending
    for (const p of data.data) {
      expect(p.status).toBe('pending')
    }
  })

  test('proposals: invalid cursor returns 400', async ({ request }) => {
    const res = await request.get('/api/proposals?cursor=invalid-cursor-value', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(400)
  })

  test('proposals: second page uses nextCursor from first page', async ({ request }) => {
    // First page
    const res1 = await request.get('/api/proposals?limit=5', { headers: { Cookie: cookies } })
    expect(res1.status()).toBe(200)
    const data1 = await res1.json()

    if (data1.nextCursor) {
      // Fetch second page
      const res2 = await request.get(`/api/proposals?limit=5&cursor=${data1.nextCursor}`, {
        headers: { Cookie: cookies },
      })
      expect(res2.status()).toBe(200)
      const data2 = await res2.json()
      expect(data2.success).toBe(true)
      expect(Array.isArray(data2.data)).toBe(true)
      // No overlap between pages
      const ids1 = new Set(data1.data.map((p: any) => p.id))
      const ids2 = data2.data.map((p: any) => p.id)
      for (const id of ids2) {
        expect(ids1.has(id)).toBe(false)
      }
    }
  })

  // ------------------------------------------------------------
  // 2. Cursor-based pagination — prospects
  // ------------------------------------------------------------
  test('prospects: returns pagination metadata', async ({ request }) => {
    const res = await request.get('/api/prospects?limit=10', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    expect(typeof data.hasMore).toBe('boolean')
  })

  test('prospects: stage filter works', async ({ request }) => {
    const res = await request.get('/api/prospects?stage=new', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    for (const p of data.data) {
      expect(p.stage).toBe('new')
    }
  })

  test('prospects: 401 without auth', async ({ request }) => {
    const res = await request.get('/api/prospects')
    expect(res.status()).toBe(401)
  })

  // ------------------------------------------------------------
  // 3. SSE notifications stream
  // ------------------------------------------------------------
  test('notifications/stream: 401 without auth', async ({ request }) => {
    const res = await request.get('/api/notifications/stream')
    expect(res.status()).toBe(401)
  })

  test('notifications/stream: returns text/event-stream with auth', async ({ request }) => {
    const res = await request.get('/api/notifications/stream', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(200)
    const ct = res.headers()['content-type'] || ''
    expect(ct).toContain('text/event-stream')
  })

  // ------------------------------------------------------------
  // 4. Cache headers
  // ------------------------------------------------------------
  test('static assets have immutable cache header', async ({ request }) => {
    // Fetch the homepage to find a _next/static asset
    const htmlRes = await request.get('/')
    const html = await htmlRes.text()
    // Extract a _next/static URL
    const match = html.match(/\/_next\/static\/[^"'\s]+/)
    if (match) {
      const assetRes = await request.get(match[0])
      const cacheControl = assetRes.headers()['cache-control'] || ''
      expect(cacheControl).toContain('max-age=31536000')
      expect(cacheControl).toContain('immutable')
    }
  })

  test('API routes have no-cache header', async ({ request }) => {
    const res = await request.get('/api/health')
    const cacheControl = res.headers()['cache-control'] || ''
    expect(cacheControl.includes('no-cache') || cacheControl.includes('no-store')).toBe(true)
  })
})
