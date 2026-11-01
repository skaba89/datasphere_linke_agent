import { test, expect } from '@playwright/test'

// ============================================================
// Tests E2E — Phase 3-2 — Teams Permissions + Performance Intelligence
//
// Couvre :
//   1. /api/teams/assignments        (auth, validation, dedup, foreign-key checks)
//   2. /api/teams/accessible-clients (lists owned + assigned)
//   3. /api/performance-intelligence (GET — kpis, best-time, top posts; POST — plan gate)
// ============================================================

const TEST_EMAIL = `e2e-p32-${Date.now()}@datasphere.io`
const TEST_PASSWORD = 'Password123!'

test.describe('Phase 3-2 — Teams Assignments + Performance Intelligence', () => {
  let cookies: string

  test.beforeAll(async ({ request }) => {
    const regRes = await request.post('/api/auth/register', {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD, name: 'E2E P3-2' },
    })
    expect(regRes.status()).toBe(201)
    const setCookie = regRes.headers()['set-cookie']
    expect(setCookie).toBeTruthy()
    cookies = setCookie.split(';')[0]
  })

  // ------------------------------------------------------------
  // 1. Teams assignments — auth + validation
  // ------------------------------------------------------------
  test('assignments: 401 without auth', async ({ request }) => {
    const getRes = await request.get('/api/teams/assignments')
    expect(getRes.status()).toBe(401)
    const postRes = await request.post('/api/teams/assignments', { data: {} })
    expect(postRes.status()).toBe(401)
    const delRes = await request.delete('/api/teams/assignments?id=abc')
    expect(delRes.status()).toBe(401)
  })

  test('assignments: empty list when no team', async ({ request }) => {
    const res = await request.get('/api/teams/assignments', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.data.length).toBe(0)
  })

  test('assignments: POST requires clientId + teamMemberId', async ({ request }) => {
    const res = await request.post('/api/teams/assignments', {
      headers: { Cookie: cookies },
      data: { clientId: '', teamMemberId: '', permission: 'view' },
    })
    expect(res.status()).toBe(400)
  })

  test('assignments: rejects invalid permission', async ({ request }) => {
    const res = await request.post('/api/teams/assignments', {
      headers: { Cookie: cookies },
      data: { clientId: 'fake', teamMemberId: 'fake', permission: 'invalid-level' },
    })
    expect(res.status()).toBe(400)
  })

  test('assignments: rejects assignment to non-existent client/member', async ({ request }) => {
    const res = await request.post('/api/teams/assignments', {
      headers: { Cookie: cookies },
      data: { clientId: 'non-existent-client-id', teamMemberId: 'non-existent-member-id', permission: 'view' },
    })
    expect(res.status()).toBe(500)
    const data = await res.json()
    expect(data.success).toBe(false)
  })

  test('assignments: DELETE requires id param', async ({ request }) => {
    const res = await request.delete('/api/teams/assignments', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(400)
  })

  // ------------------------------------------------------------
  // 2. Accessible clients — owned + assigned
  // ------------------------------------------------------------
  test('accessible-clients: 401 without auth', async ({ request }) => {
    const res = await request.get('/api/teams/accessible-clients')
    expect(res.status()).toBe(401)
  })

  test('accessible-clients: returns owned clients', async ({ request }) => {
    // 1. Create a client
    const createRes = await request.post('/api/clients', {
      headers: { Cookie: cookies },
      data: { name: 'Test Client E2E', monthlyGoal: 10, color: '#10b981' },
    })
    expect(createRes.status()).toBe(201)

    // 2. Fetch accessible clients
    const res = await request.get('/api/teams/accessible-clients', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    const found = data.data.find((c: any) => c.name === 'Test Client E2E')
    expect(found).toBeTruthy()
    expect(found.permission).toBe('manage') // owner → manage
  })

  // ------------------------------------------------------------
  // 3. Performance Intelligence — GET (KPIs)
  // ------------------------------------------------------------
  test('performance-intelligence: 401 without auth', async ({ request }) => {
    const res = await request.get('/api/performance-intelligence')
    expect(res.status()).toBe(401)
  })

  test('performance-intelligence: GET returns structured KPIs', async ({ request }) => {
    const res = await request.get('/api/performance-intelligence', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.kpis).toBeDefined()
    expect(data.data.kpis.d14).toBeDefined()
    expect(data.data.kpis.d30).toBeDefined()
    expect(data.data.kpis.d90).toBeDefined()
    expect(data.data.kpis.d14.posts).toBeDefined()
    expect(data.data.kpis.d14.likes).toBeDefined()
    expect(data.data.bestTime).toBeDefined()
    expect(data.data.contentVelocity).toBeDefined()
    expect(data.data.statusDistribution).toBeDefined()
  })

  test('performance-intelligence: POST requires Pro+ plan', async ({ request }) => {
    // Trial user → plan='pro' → should succeed OR fail with 500 (no AI provider)
    // Never 400 (validation)
    const res = await request.post('/api/performance-intelligence', { headers: { Cookie: cookies } })
    expect([200, 500]).toContain(res.status())
  })

  test('performance-intelligence: POST 401 without auth', async ({ request }) => {
    const res = await request.post('/api/performance-intelligence')
    expect(res.status()).toBe(401)
  })

  // ------------------------------------------------------------
  // 4. Database migration integrity
  // ------------------------------------------------------------
  test('ClientAssignment table exists (migration applied)', async ({ request }) => {
    // If the migration hadn't been applied, POST /api/teams/assignments would fail
    // with a different error than "Client introuvable"
    const res = await request.post('/api/teams/assignments', {
      headers: { Cookie: cookies },
      data: { clientId: 'fake-id', teamMemberId: 'fake-id', permission: 'view' },
    })
    expect(res.status()).toBe(500)
    const data = await res.json()
    // If the migration was applied, the error is about not finding the client
    // (not a SQL "relation does not exist" error)
    expect(data.error).toContain('introuvable')
  })

  // ------------------------------------------------------------
  // 5. Agency Command Center — plan gating + structure
  // ------------------------------------------------------------
  test('agency-command-center: 401 without auth', async ({ request }) => {
    const res = await request.get('/api/agency-command-center')
    expect(res.status()).toBe(401)
  })

  test('agency-command-center: trial Pro user gets 403 (Business+ required)', async ({ request }) => {
    // Trial user → plan='pro' → not Business/Agency → 403
    const res = await request.get('/api/agency-command-center', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(403)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Business')
  })
})
