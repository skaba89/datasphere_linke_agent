import { cookies } from 'next/headers'
import { createHmac } from 'crypto'

// ============================================================
// Auth helper minimaliste (cookie signé) pour DataSphere
//
// Pour la production commerciale complète, brancher next-auth
// avec un provider Credentials + GitHub/Google. En attendant,
// ce helper permet de protéger les routes /api/linkedin sans
// dépendre d'une infrastructure externe.
//
// Cookie format: <userId>.<hmac(userId)>
// ============================================================

const SECRET = process.env.DATASPHERE_AUTH_SECRET || 'dev-insecure-secret-change-me'

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const store = await cookies()
    const cookie = store.get('datasphere_session')
    if (!cookie) return null

    const [userId, sig] = cookie.value.split('.')
    if (!userId || !sig) return null

    const expected = sign(userId)
    if (sig !== expected) return null

    return userId
  } catch {
    return null
  }
}

export async function setSessionCookie(userId: string): Promise<void> {
  const store = await cookies()
  const sig = sign(userId)
  store.set('datasphere_session', `${userId}.${sig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete('datasphere_session')
}
