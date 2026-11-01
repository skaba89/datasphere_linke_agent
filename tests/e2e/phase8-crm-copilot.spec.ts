import { test, expect } from '@playwright/test'

// ============================================================
// Tests E2E — P1-C CRM Copilot — New features
//
// Couvre:
//   1. GET /api/prospects/[id] (detail with messages + tasks + revenue)
//   2. POST /api/prospects dedup (B4 fix)
//   3. PATCH /api/prospects/[id] stage validation (B5 fix)
//   4. POST /api/sequences/[id]/enroll (B3 fix — enrollment gap)
//   5. PATCH/DELETE /api/sequences/[id]
//   6. POST /api/crm-messages/[id]/reply (B9 fix — stage guard)
//   7. PATCH/DELETE /api/crm-messages/[id] (draft edit + delete)
// ============================================================

const TEST_EMAIL = `e2e-crm-${Date.now()}@datasphere.io`
const TEST_PASSWORD = 'Password123!'

test.describe('P1-C CRM Copilot — New features', () => {
  let cookies: string
  let prospectId: string
  let sequenceId: string
  let draftMessageId: string

  test.beforeAll(async ({ request }) => {
    const regRes = await request.post('/api/auth/register', {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD, name: 'CRM Test' },
    })
    expect(regRes.status()).toBe(201)
    const setCookie = regRes.headers()['set-cookie']
    expect(setCookie).toBeTruthy()
    cookies = setCookie.split(';')[0]
  })

  // ------------------------------------------------------------
  // 1. Prospect detail + dedup + stage validation
  // ------------------------------------------------------------
  test('POST /api/prospects creates a prospect (with scoring)', async ({ request }) => {
    const res = await request.post('/api/prospects', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: {
        name: 'Alice Martin',
        email: 'alice@example.com',
        company: 'TechCorp',
        title: 'CTO',
        linkedinUrl: 'https://linkedin.com/in/alicemartin',
      },
    })
    expect(res.status()).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.name).toBe('Alice Martin')
    expect(data.data.score).toBeDefined()
    prospectId = data.data.id
  })

  test('POST /api/prospects rejects duplicate email (B4 fix)', async ({ request }) => {
    const res = await request.post('/api/prospects', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: {
        name: 'Alice Duplicate',
        email: 'alice@example.com', // same email
        company: 'OtherCorp',
      },
    })
    expect(res.status()).toBe(409)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Doublon')
    expect(data.duplicateId).toBe(prospectId)
  })

  test('GET /api/prospects/[id] returns detail with stats', async ({ request }) => {
    const res = await request.get(`/api/prospects/${prospectId}`, {
      headers: { Cookie: cookies },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.name).toBe('Alice Martin')
    expect(data.data.messages).toBeDefined()
    expect(data.data.agentTasks).toBeDefined()
    expect(data.data.revenueAttributions).toBeDefined()
    expect(data.stats).toBeDefined()
    expect(data.stats.messageStats).toBeDefined()
    expect(data.stats.taskStats).toBeDefined()
  })

  test('GET /api/prospects/[id] returns 404 for unknown id', async ({ request }) => {
    const res = await request.get('/api/prospects/nonexistent-id', {
      headers: { Cookie: cookies },
    })
    expect(res.status()).toBe(404)
  })

  test('PATCH /api/prospects/[id] validates stage (B5 fix)', async ({ request }) => {
    const res = await request.patch(`/api/prospects/${prospectId}`, {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { stage: 'invalid_stage' },
    })
    expect(res.status()).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Stage invalide')
  })

  test('PATCH /api/prospects/[id] accepts valid stage', async ({ request }) => {
    const res = await request.patch(`/api/prospects/${prospectId}`, {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { stage: 'contacted' },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.data.stage).toBe('contacted')
  })

  test('PATCH /api/prospects/[id] rejects duplicate email on change', async ({ request }) => {
    // Create a second prospect first
    const create2 = await request.post('/api/prospects', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { name: 'Bob Durand', email: 'bob@example.com' },
    })
    const bob = await create2.json()

    // Try to change Alice's email to Bob's email
    const res = await request.patch(`/api/prospects/${prospectId}`, {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { email: 'bob@example.com' },
    })
    expect(res.status()).toBe(409)
  })

  // ------------------------------------------------------------
  // 2. CRM Sequences — create, enroll, edit, delete
  // ------------------------------------------------------------
  test('POST /api/sequences creates a sequence', async ({ request }) => {
    const res = await request.post('/api/sequences', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: {
        name: 'Test Sequence',
        description: 'A test sequence',
        steps: [
          { day: 1, subject: 'Hello', body: 'First message' },
          { day: 3, subject: 'Follow up', body: 'Second message' },
        ],
      },
    })
    expect(res.status()).toBe(201)
    const data = await res.json()
    sequenceId = data.data.id
  })

  test('POST /api/sequences/[id]/enroll enrolls prospect (B3 fix)', async ({ request }) => {
    const res = await request.post(`/api/sequences/${sequenceId}/enroll`, {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { prospectId },
    })
    expect(res.status()).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.messageId).toBeDefined()
    expect(data.data.stepIndex).toBe(0)
    draftMessageId = data.data.messageId
  })

  test('POST /api/sequences/[id]/enroll rejects double enrollment', async ({ request }) => {
    const res = await request.post(`/api/sequences/${sequenceId}/enroll`, {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { prospectId },
    })
    expect(res.status()).toBe(409)
  })

  test('PATCH /api/sequences/[id] updates the sequence', async ({ request }) => {
    const res = await request.patch(`/api/sequences/${sequenceId}`, {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { name: 'Updated Sequence', active: false },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.data.name).toBe('Updated Sequence')
    expect(data.data.active).toBe(false)
  })

  test('PATCH /api/sequences/[id] validates steps', async ({ request }) => {
    const res = await request.patch(`/api/sequences/${sequenceId}`, {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { steps: 'not-an-array' },
    })
    expect(res.status()).toBe(400)
  })

  // ------------------------------------------------------------
  // 3. CRM Messages — edit draft, reply, delete
  // ------------------------------------------------------------
  test('PATCH /api/crm-messages/[id] edits a draft', async ({ request }) => {
    const res = await request.patch(`/api/crm-messages/${draftMessageId}`, {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { subject: 'Edited Subject', body: 'Edited body content' },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.data.subject).toBe('Edited Subject')
  })

  test('POST /api/crm-messages/[id]/send marks as sent', async ({ request }) => {
    const res = await request.post(`/api/crm-messages/${draftMessageId}/send`, {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.data.status).toBe('sent')
    expect(data.data.sentAt).toBeTruthy()
  })

  test('POST /api/crm-messages/[id]/reply marks as replied (B9 fix)', async ({ request }) => {
    const res = await request.post(`/api/crm-messages/${draftMessageId}/reply`, {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { status: 'replied' },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.data.status).toBe('replied')
    expect(data.data.repliedAt).toBeTruthy()
  })

  test('POST /api/crm-messages/[id]/reply validates status', async ({ request }) => {
    // Create a new sent message first
    const createMsg = await request.post('/api/crm-messages', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { prospectId, subject: 'Test', body: 'Test body', status: 'sent' },
    })
    const msg = await createMsg.json()

    const res = await request.post(`/api/crm-messages/${msg.data.id}/reply`, {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { status: 'invalid_status' },
    })
    expect(res.status()).toBe(400)
  })

  test('DELETE /api/crm-messages/[id] deletes a message', async ({ request }) => {
    // Create a message to delete
    const createMsg = await request.post('/api/crm-messages', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: { prospectId, subject: 'To Delete', body: 'Will be deleted', status: 'draft' },
    })
    const msg = await createMsg.json()

    const res = await request.delete(`/api/crm-messages/${msg.data.id}`, {
      headers: { Cookie: cookies },
    })
    expect(res.status()).toBe(200)
  })

  // ------------------------------------------------------------
  // 4. Cleanup — delete sequence + prospect
  // ------------------------------------------------------------
  test('DELETE /api/sequences/[id] deletes the sequence', async ({ request }) => {
    const res = await request.delete(`/api/sequences/${sequenceId}`, {
      headers: { Cookie: cookies },
    })
    expect(res.status()).toBe(200)
  })

  test('DELETE /api/prospects/[id] deletes the prospect', async ({ request }) => {
    const res = await request.delete(`/api/prospects/${prospectId}`, {
      headers: { Cookie: cookies },
    })
    expect(res.status()).toBe(200)
  })
})
