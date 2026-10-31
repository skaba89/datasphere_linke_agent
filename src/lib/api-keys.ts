import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

// ============================================================
// API Keys Service
//
// - createApiKey : génère une clé "dsk_live_XXX", hash bcrypt, store
// - verifyApiKey : vérifie une clé et retourne le user
// - listUserApiKeys : liste les clés (sans le hash)
// - revokeApiKey : marque revokedAt
// ============================================================

const KEY_PREFIX = 'dsk_live_'

export interface CreatedApiKey {
  id: string
  name: string
  key: string  // affichée UNE SEULE fois à la création
  keyPrefix: string
  createdAt: Date
}

// ============================================================
// Créer une clé API
// ============================================================
export async function createApiKey(
  userId: string,
  name: string
): Promise<CreatedApiKey> {
  // Générer une clé aléatoire sécurisée
  const random = randomBytes(32).toString('hex')
  const fullKey = `${KEY_PREFIX}${random}`
  const keyPrefix = fullKey.substring(0, 16) // dsk_live_XXXXXXXX

  // Hash bcrypt (cost 10 = suffisant, plus rapide que pour password)
  const hashedKey = await bcrypt.hash(fullKey, 10)

  const apiKey = await db.apiKey.create({
    data: {
      userId,
      name: name.trim().slice(0, 100),
      keyPrefix,
      hashedKey,
    },
  })

  return {
    id: apiKey.id,
    name: apiKey.name,
    key: fullKey, // ⚠️ seule fois où on renvoie la clé complète
    keyPrefix,
    createdAt: apiKey.createdAt,
  }
}

// ============================================================
// Vérifier une clé API (header Authorization: Bearer dsk_live_XXX)
// Retourne l'userId si valide, null sinon
// ============================================================
export async function verifyApiKey(authHeader: string | null): Promise<{
  userId: string
  userPlan: string
} | null> {
  if (!authHeader) return null

  // Accepter "Bearer dsk_live_XXX" ou "dsk_live_XXX"
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader

  if (!token.startsWith(KEY_PREFIX)) return null

  // Le keyPrefix permet de retrouver rapidement le candidat (index)
  const keyPrefix = token.substring(0, 16)
  const candidates = await db.apiKey.findMany({
    where: { keyPrefix, revokedAt: null },
    take: 5, // au cas où collision de prefix
    include: { user: { select: { id: true, plan: true, trialEndsAt: true } } },
  })

  // Comparer chaque candidat avec bcrypt
  for (const candidate of candidates) {
    const match = await bcrypt.compare(token, candidate.hashedKey)
    if (match) {
      // Mettre à jour lastUsedAt (async, ne bloque pas)
      db.apiKey.update({
        where: { id: candidate.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {})

      // Vérifier le plan : API publique réservée au plan Business
      const trialActive = candidate.user.trialEndsAt
        ? new Date(candidate.user.trialEndsAt) > new Date()
        : false
      const effectivePlan = trialActive ? 'pro' : candidate.user.plan
      if (effectivePlan !== 'business') {
        return null // pas autorisé
      }

      return {
        userId: candidate.user.id,
        userPlan: candidate.user.plan,
      }
    }
  }

  return null
}

// ============================================================
// Lister les clés API d'un user (sans le hash)
// ============================================================
export async function listUserApiKeys(userId: string) {
  return db.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ============================================================
// Révoquer une clé API
// ============================================================
export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const apiKey = await db.apiKey.findFirst({
    where: { id: keyId, userId },
  })
  if (!apiKey) return false

  await db.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  })

  return true
}
