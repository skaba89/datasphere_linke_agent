import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { verifyLinkedInState } from '@/lib/linkedin-oauth-state'
import { encryptLinkedInToken } from '@/lib/linkedin-token-crypto'
import { db } from '@/lib/db'
import { getAppUrl } from '@/lib/app-url'

// ============================================================
// GET /api/linkedin/callback
// Route de callback OAuth LinkedIn (au cas où on configure le
// redirect_uri directement vers cette URL)
//
// ?code=XXX&state=YYY
// ============================================================

const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
const SCOPES = ['r_liteprofile', 'r_emailaddress', 'w_member_social'].join(' ')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Frontend URL (pour rediriger après traitement)
  // Utilise getAppUrl() qui gère RENDER_EXTERNAL_URL automatiquement
  const appUrl = getAppUrl(request)

  if (error) {
    return NextResponse.redirect(
      new URL(`/onboarding?error=${encodeURIComponent(error)}`, appUrl)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/onboarding?error=missing_params', appUrl)
    )
  }

  const userId = await getCurrentUserId()
  if (!userId || !verifyLinkedInState(state, userId)) {
    return NextResponse.redirect(new URL('/onboarding?error=invalid_state', appUrl))
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID!
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI!

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL('/onboarding?error=config_missing', appUrl)
    )
  }

  try {
    // Échange code -> access token
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
      console.error('[LinkedIn callback token exchange failed]', errText)
      return NextResponse.redirect(
        new URL(`/onboarding?error=token_exchange_failed`, appUrl)
      )
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token
    const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    // Récupérer le profil LinkedIn
    const profileRes = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!profileRes.ok) {
      return NextResponse.redirect(
        new URL('/onboarding?error=profile_fetch_failed', appUrl)
      )
    }
    const profile = await profileRes.json()
    const organizationId = `urn:li:person:${profile.id}`
    const displayName = [profile.localizedFirstName, profile.localizedLastName]
      .filter(Boolean).join(' ') || 'Utilisateur LinkedIn'

    // Récupérer l'email
    let email: string | null = null
    try {
      const emailRes = await fetch(
        'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (emailRes.ok) {
        const emailData = await emailRes.json()
        email = emailData.elements?.[0]?.['handle~']?.emailAddress || null
      }
    } catch {}

    // Upsert
    await db.linkedInAccount.upsert({
      where: { userId_organizationId: { userId, organizationId } },
      update: {
        displayName,
        email,
        accessToken: encryptLinkedInToken(accessToken),
        tokenExpiresAt,
        scopes: SCOPES,
        status: 'active',
        lastSyncAt: new Date(),
      },
      create: {
        userId,
        organizationId,
        displayName,
        email,
        accessToken: encryptLinkedInToken(accessToken),
        tokenExpiresAt,
        scopes: SCOPES,
        status: 'active',
        lastSyncAt: new Date(),
      },
    })

    return NextResponse.redirect(
      new URL('/onboarding?linkedin=connected', appUrl)
    )
  } catch (err: any) {
    console.error('[LinkedIn callback error]', err)
    return NextResponse.redirect(
      new URL(`/onboarding?error=${encodeURIComponent('server_error')}`, appUrl)
    )
  }
}
