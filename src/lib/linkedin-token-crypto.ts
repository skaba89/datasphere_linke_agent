import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// ============================================================
// LinkedIn Token Encryption — AES-256-GCM
//
// Format: enc1.{iv_base64url}.{authTag_base64url}.{ciphertext_base64url}
//
// Sécurité:
//   - AES-256-GCM (chiffrement authentifié)
//   - IV unique de 12 bytes par chiffrement
//   - Auth tag vérifié au déchiffrement (anti-tampering)
//   - Clé de 32 bytes (base64) depuis LINKEDIN_TOKEN_ENCRYPTION_KEY
//
// Migration:
//   - Les tokens non préfixés 'enc1.' sont refusés (pas de fallback plaintext)
//   - L'utilisateur doit reconnecter son compte LinkedIn
//   - En cas de rotation de clé, les anciens tokens doivent être
//     re-chiffrés (script de migration à exécuter manuellement)
// ============================================================

let cachedKey: Buffer | null = null

function key(): Buffer {
  if (cachedKey) return cachedKey

  const encoded = process.env.LINKEDIN_TOKEN_ENCRYPTION_KEY
  if (!encoded) {
    throw new Error(
      'LINKEDIN_TOKEN_ENCRYPTION_KEY is required. ' +
      'Generate one with: openssl rand -base64 32'
    )
  }

  const value = Buffer.from(encoded, 'base64')
  if (value.length !== 32) {
    throw new Error(
      `LINKEDIN_TOKEN_ENCRYPTION_KEY must decode to 32 bytes, got ${value.length}. ` +
      'Generate with: openssl rand -base64 32'
    )
  }

  cachedKey = value
  return cachedKey
}

export function encryptLinkedInToken(value: string): string {
  if (!value) return value

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [
    'enc1',
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.')
}

export function decryptLinkedInToken(value: string): string {
  if (!value) return value

  // Refuser les tokens non chiffrés (legacy)
  if (!value.startsWith('enc1.')) {
    throw new Error(
      'Legacy plaintext LinkedIn token detected. ' +
      'The account must be reconnected to encrypt the token. ' +
      'Do not store LinkedIn tokens in plaintext.'
    )
  }

  const parts = value.split('.')
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted token format')
  }

  const [, ivB64, authTagB64, ciphertextB64] = parts

  const decipher = createDecipheriv(
    'aes-256-gcm',
    key(),
    Buffer.from(ivB64, 'base64url')
  )
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64url'))

  try {
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    throw new Error(
      'Failed to decrypt LinkedIn token. ' +
      'The encryption key may have changed. Reconnect the account.'
    )
  }
}

// ============================================================
// Helper pour vérifier si la clé de chiffrement est configurée
// ============================================================
export function isEncryptionConfigured(): boolean {
  try {
    key()
    return true
  } catch {
    return false
  }
}
