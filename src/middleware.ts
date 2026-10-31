import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ============================================================
// Middleware DataSphere - Protection des routes
//
// ⚠️ Le middleware tourne dans l'Edge Runtime, qui ne supporte pas
// le module Node.js `crypto`. On utilise Web Crypto API (globalThis.crypto)
// qui fonctionne dans les deux runtimes (Edge + Node.js >= 19).
//
// Routes publiques : /, /login, /register, /pricing
// Routes protégées : /onboarding, /dashboard, etc.
// ============================================================

const SECRET = process.env.JWT_SECRET || process.env.DATASPHERE_AUTH_SECRET || 'dev-insecure-secret-change-me'

// Web Crypto API : HMAC-SHA256 en hex
async function sign(payload: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  // Convert ArrayBuffer -> hex string
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function verifySession(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false
  const [userId, sig] = cookieValue.split('.')
  if (!userId || !sig) return false
  const expected = await sign(userId)
  // Constant-time compare (best effort in JS)
  if (expected.length !== sig.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  }
  return diff === 0
}

// Routes accessibles sans connexion
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/pricing',
]

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
  if (PUBLIC_PATHS.includes(pathname)) {
    // Si déjà connecté et sur /login ou /register, rediriger vers /
    if ((pathname === '/login' || pathname === '/register') && isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Pages protégées : /onboarding, /dashboard, etc.
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Matcher : toutes les pages sauf les assets et API
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
