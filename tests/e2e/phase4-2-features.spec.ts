import { test, expect } from '@playwright/test'

// ============================================================
// Tests E2E — Phase 4-2 — Email Bridge + Agent Workspace + i18n
// ============================================================

const TEST_EMAIL = `e2e-p42-${Date.now()}@datasphere.io`
const TEST_PASSWORD = 'Password123!'

test.describe('Phase 4-2 — Email Bridge + Agent Workspace', () => {
  let cookies: string

  test.beforeAll(async ({ request }) => {
    const regRes = await request.post('/api/auth/register', {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD, name: 'E2E P4-2' },
    })
    expect(regRes.status()).toBe(201)
    const setCookie = regRes.headers()['set-cookie']
    expect(setCookie).toBeTruthy()
    cookies = setCookie.split(';')[0]
  })

  // ------------------------------------------------------------
  // 1. Email-to-LinkedIn Bridge
  // ------------------------------------------------------------
  test('email-bridge: GET returns documentation', async ({ request }) => {
    const res = await request.get('/api/email-bridge/inbound')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.endpoint).toBe('/api/email-bridge/inbound')
    expect(data.data.format).toBeDefined()
  })

  test('email-bridge: POST without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/email-bridge/inbound', {
      data: { from: 'test@example.com', subject: 'Hello', text: 'Content' },
    })
    expect(res.status()).toBe(401)
  })

  test('email-bridge: POST with valid auth + unknown email returns 404', async () => {
    // We can't easily compute CRON_SECRET in test, so we use the derivable
    // version. The test just verifies the endpoint structure.
    // The actual auth derivation logic is tested in security-regression.spec.ts
    test.skip(true, 'CRON_SECRET derivation requires JWT_SECRET access')
  })

  test('email-bridge: GET /drafts requires auth', async ({ request }) => {
    const res = await request.get('/api/email-bridge/drafts')
    expect(res.status()).toBe(401)
  })

  test('email-bridge: GET /drafts returns array for auth user', async ({ request }) => {
    const res = await request.get('/api/email-bridge/drafts', { headers: { Cookie: cookies } })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  // ------------------------------------------------------------
  // 2. Agent Workspace — Tasks
  // ------------------------------------------------------------
  test('agent-workspace/tasks: 401 without auth', async ({ request }) => {
    const getRes = await request.get('/api/agent-workspace/tasks')
    expect(getRes.status()).toBe(401)
    const postRes = await request.post('/api/agent-workspace/tasks', { data: { title: 'Test' } })
    expect(postRes.status()).toBe(401)
  })

  test('agent-workspace/tasks: POST requires title (3 chars min)', async ({ request }) => {
    const res = await request.post('/api/agent-workspace/tasks', {
      headers: { Cookie: cookies },
      data: { title: 'ab' },
    })
    expect(res.status()).toBe(400)
  })

  test('agent-workspace/tasks: POST rejects title over 200 chars', async ({ request }) => {
    const res = await request.post('/api/agent-workspace/tasks', {
      headers: { Cookie: cookies },
      data: { title: 'x'.repeat(201) },
    })
    expect(res.status()).toBe(400)
  })

  test('agent-workspace/tasks: full CRUD lifecycle', async ({ request }) => {
    // 1. Create
    const createRes = await request.post('/api/agent-workspace/tasks', {
      headers: { Cookie: cookies },
      data: { title: 'Test task E2E', description: 'Description', type: 'generate_post', priority: 'high' },
    })
    expect(createRes.status()).toBe(201)
    const created = await createRes.json()
    expect(created.success).toBe(true)
    expect(created.data.title).toBe('Test task E2E')
    expect(created.data.status).toBe('todo')
    const taskId = created.data.id

    // 2. List
    const listRes = await request.get('/api/agent-workspace/tasks', { headers: { Cookie: cookies } })
    expect(listRes.status()).toBe(200)
    const list = await listRes.json()
    expect(list.success).toBe(true)
    expect(list.data.find((t: any) => t.id === taskId)).toBeTruthy()

    // 3. Update status
    const patchRes = await request.patch(`/api/agent-workspace/tasks/${taskId}`, {
      headers: { Cookie: cookies },
      data: { status: 'in_progress' },
    })
    expect(patchRes.status()).toBe(200)
    const patched = await patchRes.json()
    expect(patched.data.status).toBe('in_progress')

    // 4. Mark done
    const doneRes = await request.patch(`/api/agent-workspace/tasks/${taskId}`, {
      headers: { Cookie: cookies },
      data: { status: 'done' },
    })
    expect(doneRes.status()).toBe(200)
    const done = await doneRes.json()
    expect(done.data.status).toBe('done')
    expect(done.data.completedAt).toBeTruthy()

    // 5. Reject invalid status
    const invalidRes = await request.patch(`/api/agent-workspace/tasks/${taskId}`, {
      headers: { Cookie: cookies },
      data: { status: 'invalid_status' },
    })
    expect(invalidRes.status()).toBe(400)

    // 6. Delete
    const delRes = await request.delete(`/api/agent-workspace/tasks/${taskId}`, {
      headers: { Cookie: cookies },
    })
    expect(delRes.status()).toBe(200)

    // 7. Verify deleted
    const listAfterRes = await request.get('/api/agent-workspace/tasks', { headers: { Cookie: cookies } })
    const listAfter = await listAfterRes.json()
    expect(listAfter.data.find((t: any) => t.id === taskId)).toBeUndefined()
  })

  test('agent-workspace/tasks: PATCH on non-existent returns 404', async ({ request }) => {
    const res = await request.patch('/api/agent-workspace/tasks/nonexistent-id', {
      headers: { Cookie: cookies },
      data: { status: 'todo' },
    })
    expect(res.status()).toBe(404)
  })

  // ------------------------------------------------------------
  // 3. Agent Workspace — Memory
  // ------------------------------------------------------------
  test('agent-workspace/memory: 401 without auth', async ({ request }) => {
    const getRes = await request.get('/api/agent-workspace/memory')
    expect(getRes.status()).toBe(401)
    const postRes = await request.post('/api/agent-workspace/memory', { data: { key: 'k', value: 'v' } })
    expect(postRes.status()).toBe(401)
  })

  test('agent-workspace/memory: POST requires key + value', async ({ request }) => {
    const res = await request.post('/api/agent-workspace/memory', {
      headers: { Cookie: cookies },
      data: { key: '', value: '' },
    })
    expect(res.status()).toBe(400)
  })

  test('agent-workspace/memory: upsert + delete lifecycle', async ({ request }) => {
    // 1. Create
    const createRes = await request.post('/api/agent-workspace/memory', {
      headers: { Cookie: cookies },
      data: { key: 'ton_prefere', value: 'Direct et authentique', category: 'preference' },
    })
    expect(createRes.status()).toBe(201)
    const created = await createRes.json()
    expect(created.data.key).toBe('ton_prefere')
    expect(created.data.value).toBe('Direct et authentique')

    // 2. Upsert (update same key)
    const updateRes = await request.post('/api/agent-workspace/memory', {
      headers: { Cookie: cookies },
      data: { key: 'ton_prefere', value: 'Pédagogique avec storytelling', category: 'preference' },
    })
    expect(updateRes.status()).toBe(201)
    const updated = await updateRes.json()
    expect(updated.data.value).toBe('Pédagogique avec storytelling')

    // 3. List
    const listRes = await request.get('/api/agent-workspace/memory', { headers: { Cookie: cookies } })
    expect(listRes.status()).toBe(200)
    const list = await listRes.json()
    expect(list.data.find((m: any) => m.key === 'ton_prefere')).toBeTruthy()

    // 4. Delete
    const delRes = await request.delete('/api/agent-workspace/memory/ton_prefere', {
      headers: { Cookie: cookies },
    })
    expect(delRes.status()).toBe(200)

    // 5. Verify deleted
    const listAfterRes = await request.get('/api/agent-workspace/memory', { headers: { Cookie: cookies } })
    const listAfter = await listAfterRes.json()
    expect(listAfter.data.find((m: any) => m.key === 'ton_prefere')).toBeUndefined()
  })

  test('agent-workspace/memory: DELETE non-existent returns 404', async ({ request }) => {
    const res = await request.delete('/api/agent-workspace/memory/nonexistent-key', {
      headers: { Cookie: cookies },
    })
    expect(res.status()).toBe(404)
  })
})
