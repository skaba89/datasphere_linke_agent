import { test, expect } from '@playwright/test'
import { createHmac } from 'node:crypto'

// ============================================================
// Tests E2E — P1 LinkedIn Core — New features
//
// Couvre:
//   1. PATCH /api/proposals with scheduledFor (per-post scheduling)
//   2. Cron recover-stuck-publishing (auth + structure)
//   3. Cron check-token-expiration (auth + structure)
//   4. POST /api/linkedin admin-only enforcement
// ============================================================

const TEST_EMAIL = `e2e-p1-li-${Date.now()}@datasphere.io`
const TEST_PASSWORD = 'Password123!'

// Helper: derive CRON_SECRET from JWT_SECRET (same logic as src/lib/cron-secret.ts)
function getCronSecret(): string {
  const jwtSecret = process.env.JWT_SECRET || 'ci-secret-for-build-only-32chars'
  return createHmac('sha256', jwtSecret)
    .update('datasphere-cron-secret-v1')
    .digest('hex')
}

test.describe('P1 LinkedIn Core — Per-post scheduling + cron auth + admin-only', () => {
  let cookies: string

  test.beforeAll(async ({ request }) => {
    const regRes = await request.post('/api/auth/register', {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD, name: 'E2E P1 LinkedIn' },
    })
    expect(regRes.status()).toBe(201)
    const setCookie = regRes.headers()['set-cookie']
    expect(setCookie).toBeTruthy()
    cookies = setCookie.split(';')[0]
  })

  // ------------------------------------------------------------
  // 1. Per-post scheduling via PATCH /api/proposals
  // ------------------------------------------------------------
  test('PATCH /api/proposals with scheduledFor updates the proposal', async ({ request }) => {
    // 1. Create a proposal
    const createRes = await request.post('/api/proposals', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: {
        title: 'Scheduled Post Test',
        content: 'This is a test post for scheduling.',
      },
    })
    expect(createRes.status()).toBe(201)
    const created = await createRes.json()
    const proposalId = created.data.id

    // 2. Schedule it for tomorrow
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const patchRes = await request.patch('/api/proposals', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { id: proposalId, scheduledFor: tomorrow },
    })
    expect(patchRes.status()).toBe(200)
    const patched = await patchRes.json()
    expect(patched.success).toBe(true)
    expect(patched.data.scheduledFor).toBeTruthy()
    // Scheduling a pending post should auto-approve it
    expect(patched.data.status).toBe('approved')
  })

  test('PATCH /api/proposals rejects scheduledFor in the past', async ({ request }) => {
    // 1. Create a proposal
    const createRes = await request.post('/api/proposals', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { title: 'Past Schedule Test', content: 'Testing past scheduling.' },
    })
    const created = await createRes.json()
    const proposalId = created.data.id

    // 2. Try to schedule in the past
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const patchRes = await request.patch('/api/proposals', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { id: proposalId, scheduledFor: pastDate },
    })
    expect(patchRes.status()).toBe(400)
  })

  test('PATCH /api/proposals can unschedule (scheduledFor: null)', async ({ request }) => {
    // 1. Create + schedule
    const createRes = await request.post('/api/proposals', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { title: 'Unschedule Test', content: 'Will be unscheduled.' },
    })
    const created = await createRes.json()
    const proposalId = created.data.id

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    await request.patch('/api/proposals', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { id: proposalId, scheduledFor: tomorrow },
    })

    // 2. Unschedule
    const patchRes = await request.patch('/api/proposals', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { id: proposalId, scheduledFor: null },
    })
    expect(patchRes.status()).toBe(200)
    const patched = await patchRes.json()
    expect(patched.data.scheduledFor).toBeNull()
  })

  test('PATCH /api/proposals rejects invalid date format', async ({ request }) => {
    const createRes = await request.post('/api/proposals', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { title: 'Invalid Date Test', content: 'Testing invalid date.' },
    })
    const created = await createRes.json()

    const patchRes = await request.patch('/api/proposals', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { id: created.data.id, scheduledFor: 'not-a-date' },
    })
    expect(patchRes.status()).toBe(400)
  })

  test('PATCH /api/proposals requires id', async ({ request }) => {
    const patchRes = await request.patch('/api/proposals', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { status: 'approved' },
    })
    expect(patchRes.status()).toBe(400)
  })

  test('PATCH /api/proposals requires at least one field', async ({ request }) => {
    const patchRes = await request.patch('/api/proposals', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { id: 'fake-id' },
    })
    expect(patchRes.status()).toBe(400)
  })

  // ------------------------------------------------------------
  // 2. Cron recover-stuck-publishing
  // ------------------------------------------------------------
  test('cron/recover-stuck-publishing: 401 without auth', async ({ request }) => {
    const res = await request.get('/api/cron/recover-stuck-publishing')
    expect(res.status()).toBe(401)
  })

  test('cron/recover-stuck-publishing: 401 with wrong secret', async ({ request }) => {
    const res = await request.get('/api/cron/recover-stuck-publishing', {
      headers: { Authorization: 'Bearer wrong-secret' },
    })
    expect(res.status()).toBe(401)
  })

  test('cron/recover-stuck-publishing: 200 with correct secret', async ({ request }) => {
    const secret = getCronSecret()
    const res = await request.get('/api/cron/recover-stuck-publishing', {
      headers: { Authorization: `Bearer ${secret}` },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('recovered')
    expect(data.data).toHaveProperty('failed')
    expect(data.data).toHaveProperty('errors')
  })

  // ------------------------------------------------------------
  // 3. Cron check-token-expiration
  // ------------------------------------------------------------
  test('cron/check-token-expiration: 401 without auth', async ({ request }) => {
    const res = await request.get('/api/cron/check-token-expiration')
    expect(res.status()).toBe(401)
  })

  test('cron/check-token-expiration: 200 with correct secret', async ({ request }) => {
    const secret = getCronSecret()
    const res = await request.get('/api/cron/check-token-expiration', {
      headers: { Authorization: `Bearer ${secret}` },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('expired')
    expect(data.data).toHaveProperty('warning')
    expect(data.data).toHaveProperty('urgent')
  })

  // ------------------------------------------------------------
  // 4. POST /api/linkedin admin-only enforcement
  // ------------------------------------------------------------
  test('POST /api/linkedin with non-admin user returns 403', async ({ request }) => {
    // The test user (trial Pro) is not an admin
    const res = await request.post('/api/linkedin', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: {
        organizationId: 'urn:li:person:test',
        displayName: 'Test',
        accessToken: 'fake-token',
      },
    })
    expect(res.status()).toBe(403)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('administrateur')
  })
})
