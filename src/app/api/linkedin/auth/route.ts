import { NextResponse } from 'next/server'
import { createLinkedInState, verifyLinkedInState } from '@/lib/linkedin-oauth-state'
import { encryptLinkedInToken } from '@/lib/linkedin-token-crypto'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { checkPlanLimit } from '@/lib/plans'
import { getAppUrl } from '@/lib/app-url'

// ============================================================
// GET /api/linkedin/auth
// Retourne l'URL d'autorisation LinkedIn OAuth 2.0
// ============================================================

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'

// ✅ Scopes actuels LinkedIn (OpenID Connect + partage)
// r_liteprofile et r_emailaddress sont DEPRÉCIÉS depuis 2024
const SCOPES = ['openid', 'profile', 'email', 'w_member_social'].join(' ')

function getLinkedInRedirectUri(): string | null {
  if (process.env.LINKEDIN_REDIRECT_URI) return process.env.LINKEDIN_REDIRECT_URI
  const appUrl = getAppUrl()
  if (appUrl && appUrl.startsWith('http')) return `${appUrl}/api/linkedin/callback`
  return null
}

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const clientId = process.env.LINKEDIN_CLIENT_ID
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
    const redirectUri = getLinkedInRedirectUri()

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'LinkedIn non configuré. Ajoutez LINKEDIN_CLIENT_ID et LINKEDIN_CLIENT_SECRET dans Render.',
      }, { status: 500 })
    }

    if (!redirectUri) {
      return NextResponse.json({
        success: false,
        error: 'URL de l\'application non détectée. Définissez NEXT_PUBLIC_APP_URL ou LINKEDIN_REDIRECT_URI.',
      }, { status: 500 })
    }

    const limitCheck = await checkPlanLimit(userId, 'linkedinAccounts')
    if (!limitCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: `Limite de comptes LinkedIn atteinte (${limitCheck.limit}).`,
        upgrade: true,
      }, { status: 402 })
    }

    const state = createLinkedInState(userId)

    const authUrl = new URL(LINKEDIN_AUTH_URL)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('scope', SCOPES)

    return NextResponse.json({ success: true, data: { authUrl: authUrl.toString() } })
  } catch (error: any) {
    console.error('[GET /api/linkedin/auth]', error)
    return NextResponse.json({ success: false, error: error.message ?? 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// POST /api/linkedin/auth
// Échange le code contre un access token + récupère le profil
// ============================================================
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { code, state } = await request.json()
    if (!code || !state) return NextResponse.json({ success: false, error: 'Code et state requis' }, { status: 400 })
    if (!verifyLinkedInState(state, userId)) return NextResponse.json({ success: false, error: 'State OAuth invalide ou expiré' }, { status: 400 })

    const clientId = process.env.LINKEDIN_CLIENT_ID!
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!
    const redirectUri = getLinkedInRedirectUri()
    if (!redirectUri) return NextResponse.json({ success: false, error: 'Redirect URI non configuré' }, { status: 500 })

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
      console.error('[LinkedIn token exchange failed]', tokenRes.status, errText)
      return NextResponse.json({ success: false, error: `Échange du code échoué (${tokenRes.status}): ${errText}` }, { status: 502 })
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token
    const expiresIn = tokenData.expires_in || 5184000 // 60 jours par défaut
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)

    // 2. Récupérer le profil via OpenID Connect /v2/userinfo
    // (remplace /v2/me qui est déprécié avec les nouveaux scopes)
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!profileRes.ok) {
      const errText = await profileRes.text()
      console.error('[LinkedIn profile fetch failed]', profileRes.status, errText)
      return NextResponse.json({ success: false, error: `Profil LinkedIn inaccessible (${profileRes.status})` }, { status: 502 })
    }

    const profile = await profileRes.json()
    // OpenID Connect returns: sub, name, given_name, family_name, email, picture, locale
    const organizationId = `urn:li:person:${profile.sub}`
    const displayName = profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(' ') || 'Utilisateur LinkedIn'
    const email = profile.email || null
    const pictureUrl = profile.picture || null

    // 3. Upsert (anti-bug P2002)
    const account = await db.linkedInAccount.upsert({
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

    const { accessToken: _a, refreshToken: _r, ...safe } = account as any
    return NextResponse.json({ success: true, data: safe }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/linkedin/auth]', error)
    return NextResponse.json({ success: false, error: error.message ?? 'Erreur serveur' }, { status: 500 })
  }
}
