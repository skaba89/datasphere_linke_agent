import { TOTP, generateSecret } from 'otplib'
import QRCode from 'qrcode'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

// ============================================================
// 2FA Service - TOTP (Time-based One-Time Password)
//
// Basé sur otplib v13 (RFC 6238) - API async
// Compatible avec : Google Authenticator, Microsoft Authenticator,
// Authy, 1Password, etc.
// ============================================================

const APP_NAME = 'DataSphere'

const totp = new TOTP({
  issuer: APP_NAME,
  digits: 6,
  period: 30,
  algorithm: 'sha1',
})

// ============================================================
// Génère un secret TOTP pour un user
// ============================================================
export function generateTwoFactorSecret(_userEmail: string): string {
  return generateSecret()
}

// ============================================================
// Génère l'URI otpauth pour le QR code
// Format : otpauth://totp/DataSphere:email?secret=XXX&issuer=DataSphere
// ============================================================
export function generateOtpAuthUri(userEmail: string, secret: string): string {
  return totp.toURI({ label: userEmail, secret })
}

// ============================================================
// Génère le QR code en data URL (base64)
// ============================================================
export async function generateQrCodeDataUrl(otpauthUri: string): Promise<string> {
  return await QRCode.toDataURL(otpauthUri, {
    width: 240,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

// ============================================================
// Vérifie un code TOTP (6 digits) - async (otplib v13)
// ============================================================
export async function verifyTwoFactorToken(token: string, secret: string): Promise<boolean> {
  try {
    const result = await totp.verify(token.replace(/\s/g, ''), { secret })
    return result.valid === true
  } catch {
    return false
  }
}

// ============================================================
// Génère 8 codes de secours (à stocker hashés)
// ============================================================
export function generateBackupCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < 8; i++) {
    const bytes = randomBytes(4).toString('hex').toUpperCase()
    codes.push(`${bytes.substring(0, 4)}-${bytes.substring(4, 8)}`)
  }
  return codes
}

// ============================================================
// Hash les codes de secours (pour stockage)
// ============================================================
export async function hashBackupCodes(codes: string[]): Promise<string> {
  const hashed = await Promise.all(
    codes.map(async (code) => {
      const hash = await bcrypt.hash(code, 10)
      return hash
    })
  )
  return JSON.stringify(hashed)
}

// ============================================================
// Vérifie un code de secours (et le supprime de la liste)
// Retourne [isValid, newHashedCodesJson]
// ============================================================
export async function verifyBackupCode(
  code: string,
  hashedCodesJson: string
): Promise<[boolean, string | null]> {
  let hashedCodes: string[]
  try {
    hashedCodes = JSON.parse(hashedCodesJson)
  } catch {
    return [false, null]
  }

  for (let i = 0; i < hashedCodes.length; i++) {
    const match = await bcrypt.compare(code, hashedCodes[i])
    if (match) {
      hashedCodes.splice(i, 1)
      return [true, JSON.stringify(hashedCodes)]
    }
  }

  return [false, null]
}
