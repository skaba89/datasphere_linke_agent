import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ============================================================
// Middleware LinkedInPost - Protection des routes
//
// ⚠️ Le middleware tourne dans l'Edge Runtime (Web Crypto API)
//
// Cookie format v2: v2.{userId}.{expires}.{base64url-signature}
// Cookie format v1 (legacy): {userId}.{hex-signature}
// ============================================================

const SECRET = process.env.JWT_SECRET || process.env.DATASPHERE_AUTH_SECRET || 'dev-insecure-secret-change-me'

async function sign(payload: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  // Convert to base64url (matches auth.ts format)
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function verifySession(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false

  const parts = cookieValue.split('.')

  // Format v2: v2.{userId}.{expires}.{base64url-signature}
  if (parts.length === 4 && parts[0] === 'v2') {
    const [, userId, expiresText, signature] = parts
    if (!userId || !expiresText || !signature) return false

    // Vérifier l'expiration
    const expires = Number(expiresText)
    if (!Number.isSafeInteger(expires) || expires <= Date.now()) return false

    // Vérifier la signature
    const payload = `v2.${userId}.${expiresText}`
    const expected = await sign(payload)
    if (expected.length !== signature.length) return false
    let diff = 0
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
    }
    return diff === 0
  }

  // Format v1 (legacy): {userId}.{hex-signature}
  if (parts.length === 2) {
    const [userId, sig] = parts
    if (!userId || !sig) return false
    const expected = await sign(userId)
    if (expected.length !== sig.length) return false
    let diff = 0
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
    }
    return diff === 0
  }

  return false
}

// Routes accessibles sans connexion
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/pricing',
  '/connect/linkedin',
  '/api/linkedin/callback',
]

// Prefixes de routes publiques (pour les routes dynamiques /legal/*, /blog/*, etc.)
const PUBLIC_PREFIXES = [
  '/legal/',
  '/blog/',
  '/affiliate',
]

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Routes API : laisser passer (chaque route fait son propre check)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Assets statiques - skip
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$/)
  ) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('datasphere_session')?.value
  const isAuthenticated = await verifySession(sessionCookie)

  // Pages publiques
  if (isPublicPath(pathname)) {
    // Si déjà connecté et sur /login ou /register, rediriger vers /
    if ((pathname === '/login' || pathname === '/register') && isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Pages protégées : /onboarding, /dashboard, /settings, etc.
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
