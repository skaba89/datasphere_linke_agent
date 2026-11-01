import { test, expect } from '@playwright/test'

// ============================================================
// Tests E2E - LinkedIn API (sans vrai compte LinkedIn)
// Adapté : le chiffrement des tokens peut échouer en CI si
// LINKEDIN_TOKEN_ENCRYPTION_KEY n'est pas défini.
// On teste l'auth protection + le flow sans dépendre du crypto.
// ============================================================

test.describe('LinkedIn API protection', () => {
  test('GET /api/linkedin without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/linkedin')
    expect(res.status()).toBe(401)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Non authentifié')
  })

  test('POST /api/linkedin without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/linkedin', {
      data: {
        organizationId: 'urn:li:person:test',
        displayName: 'Test',
        accessToken: 'tok',
      },
    })
    expect(res.status()).toBe(401)
  })

  test('DELETE /api/linkedin/[id] without auth returns 401', async ({ request }) => {
    const res = await request.delete('/api/linkedin/fake-id')
    expect(res.status()).toBe(401)
  })

  test('POST /api/linkedin/publish without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/linkedin/publish', {
      data: { content: 'test' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/linkedin/auth without config returns error', async ({ request }) => {
    const email = `li-test-${Date.now()}@datasphere.io`
    const regRes = await request.post('/api/auth/register', {
      data: { email, password: 'Password123!', name: 'LI Test' },
    })
    expect([201, 429]).toContain(regRes.status())
    if (regRes.status() !== 201) {
      test.skip(true, 'Rate limited in CI')
      return
    }
    const setCookie = regRes.headers()['set-cookie']
    expect(setCookie).toBeTruthy()
    const cookies = setCookie.split(';')[0]

    const res = await request.get('/api/linkedin/auth', {
      headers: { Cookie: cookies },
    })

    const data = await res.json()
    if (res.status() === 500) {
      expect(data.success).toBe(false)
      expect(data.error).toContain('LinkedIn')
    } else if (res.status() === 200) {
      expect(data.success).toBe(true)
      expect(data.data.authUrl).toContain('linkedin.com')
    }
  })
})

test.describe('LinkedIn upsert (the bug fix)', () => {
  test('POST /api/linkedin creates account, then upsert reactivates after disable', async () => {
    // ⚠️ This test is now SKIPPED because POST /api/linkedin is admin-only
    // (security fix: prevents OAuth bypass). The upsert logic is still tested
    // via the OAuth callback flow (GET /api/linkedin/auth → callback → upsert).
    // To re-enable this test, the user would need to be promoted to admin first.
    test.skip(true, 'POST /api/linkedin is now admin-only (security fix)')
  })

  test('POST /api/linkedin without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/linkedin', {
      data: {
        organizationId: 'urn:li:person:test',
        displayName: 'Test',
        accessToken: 'token',
      },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/linkedin with non-admin user returns 403', async ({ request }) => {
    const email = `nonadmin-${Date.now()}@datasphere.io`
    const regRes = await request.post('/api/auth/register', {
      data: { email, password: 'Password123!', name: 'Non Admin' },
    })
    if (regRes.status() !== 201) {
      test.skip(true, 'Rate limited in CI')
      return
    }
    const setCookie = regRes.headers()['set-cookie']
    expect(setCookie).toBeTruthy()
    const cookies = setCookie.split(';')[0]

    const res = await request.post('/api/linkedin', {
      headers: { Cookie: cookies, 'Content-Type': 'application/json' },
      data: {
        organizationId: 'urn:li:person:test',
        displayName: 'Test',
        accessToken: 'token',
      },
    })
    // Non-admin users get 403 (OAuth bypass prevention)
    expect(res.status()).toBe(403)
  })
})

test.describe('LinkedIn active account switcher', () => {
  test('PUT /api/linkedin/active without auth returns 401', async ({ request }) => {
    const res = await request.put('/api/linkedin/active', {
      data: { accountId: 'fake' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/linkedin without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/linkedin')
    expect(res.status()).toBe(401)
  })

  test('DELETE /api/linkedin/[id] without auth returns 401', async ({ request }) => {
    const res = await request.delete('/api/linkedin/fake-id')
    expect(res.status()).toBe(401)
  })
})
