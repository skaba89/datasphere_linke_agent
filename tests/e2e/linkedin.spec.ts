import { test, expect } from '@playwright/test'

// ============================================================
// Tests E2E - LinkedIn API (sans vrai compte LinkedIn)
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

  test('POST /api/linkedin/auth without LinkedIn config returns 500', async ({ request, context }) => {
    // Créer un user + login
    const email = `li-test-${Date.now()}@datasphere.io`
    const regRes = await request.post('/api/auth/register', {
      data: { email, password: 'Password123!', name: 'LI Test' },
    })
    expect(regRes.status()).toBe(201)
    const cookies = regRes.headers()['set-cookie'].split(';')[0]

    // Tenter /api/linkedin/auth (LinkedIn non configuré en test)
    const res = await request.get('/api/linkedin/auth', {
      headers: { Cookie: cookies },
    })

    // Doit retourner 500 (LINKEDIN_CLIENT_ID non défini en test)
    expect(res.status()).toBe(500)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Configuration LinkedIn manquante')
  })
})

test.describe('LinkedIn upsert (the bug fix)', () => {
  test('POST /api/linkedin creates account, then upsert reactivates after disable', async ({ request }) => {
    // Register
    const email = `upsert-${Date.now()}@datasphere.io`
    const regRes = await request.post('/api/auth/register', {
      data: { email, password: 'Password123!', name: 'Upsert Test' },
    })
    const cookies = regRes.headers()['set-cookie'].split(';')[0]
    const headers = { Cookie: cookies, 'Content-Type': 'application/json' }

    // 1. Create
    const createRes = await request.post('/api/linkedin', {
      headers,
      data: {
        organizationId: 'urn:li:person:upsert-test',
        displayName: 'Marie Test',
        accessToken: 'token-v1',
      },
    })
    expect(createRes.status()).toBe(201)
    const created = await createRes.json()
    expect(created.data.status).toBe('active')

    // 2. Get the account ID
    const listRes = await request.get('/api/linkedin', { headers })
    const list = await listRes.json()
    const accountId = list.data[0].id

    // 3. Disable (DELETE)
    const delRes = await request.delete(`/api/linkedin/${accountId}`, { headers })
    expect(delRes.status()).toBe(200)

    // Verify disabled
    const listAfter = await request.get('/api/linkedin', { headers })
    const listAfterData = await listAfter.json()
    expect(listAfterData.data[0].status).toBe('disabled')

    // 4. ⭐ UPSERT réactivation (LE TEST DU BUG CORRIGÉ)
    const reactivateRes = await request.post('/api/linkedin', {
      headers,
      data: {
        organizationId: 'urn:li:person:upsert-test',
        displayName: 'Marie réactivée',
        accessToken: 'token-v2',
      },
    })
    expect(reactivateRes.status()).toBe(201)
    const reactivated = await reactivateRes.json()
    expect(reactivated.data.status).toBe('active')

    // 5. Vérifier qu'on a toujours UN seul compte (pas deux)
    const finalList = await request.get('/api/linkedin', { headers })
    const finalData = await finalList.json()
    expect(finalData.data.length).toBe(1)
    expect(finalData.data[0].displayName).toBe('Marie réactivée')
    expect(finalData.data[0].status).toBe('active')

    // 6. Le token doit être le nouveau (token-v2)
    // (on ne peut pas le vérifier via l'API car il n'est pas exposé)
  })
})

test.describe('LinkedIn active account switcher', () => {
  test('PUT /api/linkedin/active switches active account', async ({ request }) => {
    const email = `switch-${Date.now()}@datasphere.io`
    const regRes = await request.post('/api/auth/register', {
      data: { email, password: 'Password123!', name: 'Switch Test' },
    })
    const cookies = regRes.headers()['set-cookie'].split(';')[0]
    const headers = { Cookie: cookies, 'Content-Type': 'application/json' }

    // Créer 2 comptes
    await request.post('/api/linkedin', {
      headers,
      data: {
        organizationId: 'urn:li:person:acc1',
        displayName: 'Account 1',
        accessToken: 'tok1',
      },
    })

    await request.post('/api/linkedin', {
      headers,
      data: {
        organizationId: 'urn:li:person:acc2',
        displayName: 'Account 2',
        accessToken: 'tok2',
      },
    })

    // Lister
    const listRes = await request.get('/api/linkedin', { headers })
    const list = await listRes.json()
    expect(list.data.length).toBe(2)

    // Le 1er créé est 'active' (upsert a réactivé le 1er quand on a créé le 2e en fait non,
    // les deux sont 'active' parce qu'on a pas encore fait de switch)
    const activeCount = list.data.filter((a: any) => a.status === 'active').length
    expect(activeCount).toBeGreaterThan(0)

    // Switch vers acc2
    const acc2 = list.data.find((a: any) => a.displayName === 'Account 2')
    const switchRes = await request.put('/api/linkedin/active', {
      headers,
      data: { accountId: acc2.id },
    })
    expect(switchRes.status()).toBe(200)

    // Vérifier que acc2 est le seul actif
    const finalList = await request.get('/api/linkedin', { headers })
    const finalData = await finalList.json()
    const activeAccounts = finalData.data.filter((a: any) => a.status === 'active')
    expect(activeAccounts.length).toBe(1)
    expect(activeAccounts[0].displayName).toBe('Account 2')
  })
})
