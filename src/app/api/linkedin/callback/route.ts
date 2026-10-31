import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { verifyLinkedInState } from '@/lib/linkedin-oauth-state'
import { encryptLinkedInToken } from '@/lib/linkedin-token-crypto'
import { db } from '@/lib/db'
import { getAppUrl } from '@/lib/app-url'

// ============================================================
// GET /api/linkedin/callback
// Callback OAuth LinkedIn — LinkedIn redirige ici après autorisation
// ?code=XXX&state=YYY
// ============================================================

const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
const SCOPES = ['openid', 'profile', 'email', 'w_member_social'].join(' ')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = getAppUrl(request)

  if (error) {
    return NextResponse.redirect(new URL(`/?linkedin_error=${encodeURIComponent(error)}`, appUrl))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/?linkedin_error=missing_params', appUrl))
  }

  const userId = await getCurrentUserId()
  if (!userId || !verifyLinkedInState(state, userId)) {
    return NextResponse.redirect(new URL('/?linkedin_error=invalid_state', appUrl))
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  // Redirect URI : RENDER_EXTERNAL_URL en priorité (toujours fiable sur Render)
  const redirectUri = (process.env.LINKEDIN_REDIRECT_URI && process.env.LINKEDIN_REDIRECT_URI.startsWith('http'))
    ? process.env.LINKEDIN_REDIRECT_URI
    : (process.env.RENDER_EXTERNAL_URL && process.env.RENDER_EXTERNAL_URL.startsWith('http'))
    ? `${process.env.RENDER_EXTERNAL_URL}/api/linkedin/callback`
    : `${appUrl}/api/linkedin/callback`

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL('/?linkedin_error=config_missing', appUrl))
  }

  try {
    // 1. Échange code → access token
    const tokenRes = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error('[LinkedIn callback] Token exchange failed:', tokenRes.status, errText)
      return NextResponse.redirect(new URL('/?linkedin_error=token_exchange_failed', appUrl))
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token
    const expiresIn = tokenData.expires_in || 5184000
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)

    // 2. Récupérer le profil via OpenID Connect /v2/userinfo
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!profileRes.ok) {
      const errText = await profileRes.text()
      console.error('[LinkedIn callback] Profile fetch failed:', profileRes.status, errText)
      return NextResponse.redirect(new URL('/?linkedin_error=profile_failed', appUrl))
    }

    const profile = await profileRes.json()
    const organizationId = `urn:li:person:${profile.sub}`
    const displayName = profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(' ') || 'Utilisateur LinkedIn'
    const email = profile.email || null
    const pictureUrl = profile.picture || null

    // 3. Upsert
    await db.linkedInAccount.upsert({
      where: { userId_organizationId: { userId, organizationId } },
      update: {
        displayName, email, pictureUrl,
        accessToken: encryptLinkedInToken(accessToken),
        tokenExpiresAt, scopes: SCOPES,
        status: 'active', lastSyncAt: new Date(),
      },
      create: {
        userId, organizationId, displayName, email, pictureUrl,
        accessToken: encryptLinkedInToken(accessToken),
        tokenExpiresAt, scopes: SCOPES,
        status: 'active', lastSyncAt: new Date(),
      },
    })

    // 4. Rediriger vers le dashboard avec succès
    return NextResponse.redirect(new URL('/?linkedin=connected', appUrl))
  } catch (err: any) {
    console.error('[LinkedIn callback error]', err)
    return NextResponse.redirect(new URL('/?linkedin_error=server_error', appUrl))
  }
}
