import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { checkPlanLimit } from '@/lib/plans'

// ============================================================
// GET /api/linkedin/auth
// Retourne l'URL d'autorisation LinkedIn OAuth 2.0
// ============================================================

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
const SCOPES = ['r_liteprofile', 'r_emailaddress', 'w_member_social'].join(' ')

export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration LinkedIn manquante. L\'admin doit définir LINKEDIN_CLIENT_ID/SECRET/REDIRECT_URI.',
        },
        { status: 500 }
      )
    }

    // Vérifier la limite de comptes LinkedIn
    const limitCheck = await checkPlanLimit(userId, 'linkedinAccounts')
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Vous avez atteint la limite de comptes LinkedIn de votre plan (${limitCheck.limit}). Passez à l'offre supérieure.`,
          upgrade: true,
        },
        { status: 402 }
      )
    }

    // State anti-CSRF
    const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64url')

    const authUrl = new URL(LINKEDIN_AUTH_URL)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('scope', SCOPES)

    return NextResponse.json({
      success: true,
      data: { authUrl: authUrl.toString() },
    })
  } catch (error: any) {
    console.error('[GET /api/linkedin/auth]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST /api/linkedin/auth
// Échange le code d'autorisation contre un access token
// Body: { code: string, state: string }
// ============================================================
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { code, state } = await request.json()
    if (!code || !state) {
      return NextResponse.json(
        { success: false, error: 'Code et state requis' },
        { status: 400 }
      )
    }

    // Vérifier le state (anti-CSRF)
    let stateData: { userId: string; ts: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch {
      return NextResponse.json(
        { success: false, error: 'State invalide' },
        { status: 400 }
      )
    }

    if (stateData.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'State ne correspond pas à l\'utilisateur' },
        { status: 400 }
      )
    }

    // Le state expire après 10 min
    if (Date.now() - stateData.ts > 10 * 60 * 1000) {
      return NextResponse.json(
        { success: false, error: 'State expiré. Réessayez.' },
        { status: 400 }
      )
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID!
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI!

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
      console.error('[LinkedIn token exchange failed]', tokenRes.status, errText)
      return NextResponse.json(
        { success: false, error: `Échange du code échoué (${tokenRes.status})` },
        { status: 502 }
      )
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token
    const expiresIn = tokenData.expires_in
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)

    // Récupérer le profil LinkedIn
    const profileRes = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!profileRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Récupération du profil LinkedIn échouée' },
        { status: 502 }
      )
    }
    const profile = await profileRes.json()
    const organizationId = `urn:li:person:${profile.id}`
    const displayName = [profile.localizedFirstName, profile.localizedLastName]
      .filter(Boolean)
      .join(' ') || 'Utilisateur LinkedIn'

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

    // ✅ Upsert (anti-bug P2002)
    const account = await db.linkedInAccount.upsert({
      where: { userId_organizationId: { userId, organizationId } },
      update: {
        displayName,
        email,
        accessToken,
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
        accessToken,
        tokenExpiresAt,
        scopes: SCOPES,
        status: 'active',
        lastSyncAt: new Date(),
      },
    })

    const { accessToken: _a, refreshToken: _r, ...safe } = account as any
    return NextResponse.json({
      success: true,
      data: safe,
    }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/linkedin/auth]', error)
    return NextResponse.json(
      { success: false, error: error.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}
