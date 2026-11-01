import { test, expect } from '@playwright/test'
import { createHmac } from 'node:crypto'

// ============================================================
// Tests E2E — Hermes Agent
//
// Couvre:
//   1. /api/hermes/config (GET, PUT) — auth + validation
//   2. /api/hermes/runs (GET) — auth + structure
//   3. /api/hermes/run (POST) — auth + run lifecycle
//   4. /api/cron/hermes (GET) — cron auth + structure
// ============================================================

const TEST_EMAIL = `e2e-hermes-${Date.now()}@datasphere.io`
const TEST_PASSWORD = 'Password123!'

function getCronSecret(): string {
  const jwtSecret = process.env.JWT_SECRET || 'ci-secret-for-build-only-32chars'
  return createHmac('sha256', jwtSecret)
    .update('datasphere-cron-secret-v1')
    .digest('hex')
}

test.describe('Hermes Agent', () => {
  let cookies: string

  test.beforeAll(async ({ request }) => {
    const regRes = await request.post('/api/auth/register', {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD, name: 'Hermes Test' },
    })
    expect(regRes.status()).toBe(201)
    const setCookie = regRes.headers()['set-cookie']
    expect(setCookie).toBeTruthy()
    cookies = setCookie.split(';')[0]
  })

  // ------------------------------------------------------------
  // 1. Config API
  // ------------------------------------------------------------
  test('hermes/config: 401 without auth', async ({ request }) => {
    const getRes = await request.get('/api/hermes/config')
    expect(getRes.status()).toBe(401)
    const putRes = await request.put('/api/hermes/config', { data: { enabled: true } })
    expect(putRes.status()).toBe(401)
  })

  test('hermes/config: GET creates default config', async ({ request }) => {
    const res = await request.get('/api/hermes/config', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
    expect(data.data.enabled).toBe(false)
    expect(data.data.maxTasksPerRun).toBe(5)
    expect(Array.isArray(data.data.workflowSteps)).toBe(true)
    expect(data.data.workflowSteps.length).toBeGreaterThan(0)
    expect(data.meta.availableSteps).toBeDefined()
  })

  test('hermes/config: PUT enables Hermes', async ({ request }) => {
    const res = await request.put('/api/hermes/config', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { enabled: true },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.enabled).toBe(true)
  })

  test('hermes/config: PUT updates maxTasksPerRun', async ({ request }) => {
    const res = await request.put('/api/hermes/config', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { maxTasksPerRun: 10 },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.data.maxTasksPerRun).toBe(10)
  })

  test('hermes/config: PUT rejects maxTasksPerRun out of range', async ({ request }) => {
    const res = await request.put('/api/hermes/config', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { maxTasksPerRun: 50 },
    })
    expect(res.status()).toBe(400)
  })

  test('hermes/config: PUT rejects invalid workflowSteps', async ({ request }) => {
    const res = await request.put('/api/hermes/config', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { workflowSteps: ['invalid_step'] },
    })
    expect(res.status()).toBe(400)
  })

  test('hermes/config: PUT updates workflowSteps with valid steps', async ({ request }) => {
    const res = await request.put('/api/hermes/config', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { workflowSteps: ['pending_tasks', 'summarize'] },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.data.workflowSteps).toEqual(['pending_tasks', 'summarize'])
  })

  // ------------------------------------------------------------
  // 2. Runs API
  // ------------------------------------------------------------
  test('hermes/runs: 401 without auth', async ({ request }) => {
    const res = await request.get('/api/hermes/runs')
    expect(res.status()).toBe(401)
  })

  test('hermes/runs: GET returns array (empty initially)', async ({ request }) => {
    const res = await request.get('/api/hermes/runs', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  // ------------------------------------------------------------
  // 3. Run API (manual trigger)
  // ------------------------------------------------------------
  test('hermes/run: 401 without auth', async ({ request }) => {
    const res = await request.post('/api/hermes/run', { data: {} })
    expect(res.status()).toBe(401)
  })

  test('hermes/run: POST triggers a run and returns result', async ({ request }) => {
    // Disable Hermes first to avoid notification side effects
    await request.put('/api/hermes/config', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { enabled: false, notifyOnDone: false, notifyOnError: false },
    })

    const res = await request.post('/api/hermes/run', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { trigger: 'manual' },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
    expect(data.data.runId).toBeDefined()
    expect(['success', 'partial', 'failed']).toContain(data.data.status)
    expect(data.data.stepsTotal).toBeGreaterThan(0)
    expect(typeof data.data.durationMs).toBe('number')
  })

  test('hermes/run: after run, runs list contains the new run', async ({ request }) => {
    const res = await request.get('/api/hermes/runs', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.data.length).toBeGreaterThan(0)
    const latestRun = data.data[0]
    expect(latestRun.trigger).toBe('manual')
    expect(latestRun.status).toMatch(/^(success|partial|failed)$/)
    expect(latestRun.stepsJson).toBeDefined()
  })

  // ------------------------------------------------------------
  // 4. Cron Hermes
  // ------------------------------------------------------------
  test('cron/hermes: 401 without auth', async ({ request }) => {
    const res = await request.get('/api/cron/hermes')
    expect(res.status()).toBe(401)
  })

  test('cron/hermes: 401 with wrong secret', async ({ request }) => {
    const res = await request.get('/api/cron/hermes', {
      headers: { Authorization: 'Bearer wrong-secret' },
    })
    expect(res.status()).toBe(401)
  })

  test('cron/hermes: 200 with correct secret', async ({ request }) => {
    const secret = getCronSecret()
    const res = await request.get('/api/cron/hermes', {
      headers: { Authorization: `Bearer ${secret}` },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('totalRuns')
    expect(data.data).toHaveProperty('successCount')
    expect(data.data).toHaveProperty('durationMs')
  })
})
