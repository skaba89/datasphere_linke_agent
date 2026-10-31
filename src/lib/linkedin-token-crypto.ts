import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

function key(): Buffer {
  const encoded = process.env.LINKEDIN_TOKEN_ENCRYPTION_KEY
  if (!encoded) throw new Error('LINKEDIN_TOKEN_ENCRYPTION_KEY is required')
  const value = Buffer.from(encoded, 'base64')
  if (value.length !== 32) throw new Error('LINKEDIN_TOKEN_ENCRYPTION_KEY must decode to 32 bytes')
  return value
}
export function encryptLinkedInToken(value: string): string {
  if (!value) return value
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return ['enc1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.')
}
export function decryptLinkedInToken(value: string): string {
  if (!value) return value
  if (!value.startsWith('enc1.')) throw new Error('Legacy plaintext LinkedIn token: reconnect account or run a controlled migration')
  const parts = value.split('.')
  if (parts.length !== 4) throw new Error('Invalid encrypted token')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(parts[1], 'base64url'))
  decipher.setAuthTag(Buffer.from(parts[2], 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8')
}
