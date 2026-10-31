// ============================================================
// Notifications Service - Telegram + WhatsApp
//
// Telegram : notifications via bot (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)
// WhatsApp : notifications via CallMeBot (WHATSAPP_CALLMEBOT_KEY + WHATSAPP_PHONE)
//
// Usage :
//   import { notify } from '@/lib/messaging'
//   await notify('Post publié avec succès !')
// ============================================================

interface NotifyOptions {
  message: string
  // Si true, notifie même en dev (utile pour tests)
  force?: boolean
}

interface NotifyResult {
  telegram: boolean
  whatsapp: boolean
  errors: string[]
}

// ============================================================
// Telegram
// ============================================================
async function sendTelegram(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) return false

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[Telegram] Failed:', err)
      return false
    }
    return true
  } catch (err: any) {
    console.error('[Telegram] Error:', err.message)
    return false
  }
}

// ============================================================
// WhatsApp via CallMeBot
// CallMeBot : https://www.callmebot.com/blog/free-api-whatsapp-messages/
// ============================================================
async function sendWhatsApp(message: string): Promise<boolean> {
  const apiKey = process.env.WHATSAPP_CALLMEBOT_KEY
  const phone = process.env.WHATSAPP_PHONE

  if (!apiKey || !phone) return false

  try {
    // CallMeBot API : GET avec query params
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) {
      const err = await res.text()
      console.error('[WhatsApp] Failed:', err)
      return false
    }
    return true
  } catch (err: any) {
    console.error('[WhatsApp] Error:', err.message)
    return false
  }
}

// ============================================================
// Fonction principale : notifie sur tous les canaux configurés
// ============================================================
export async function notify(options: NotifyOptions): Promise<NotifyResult>
export async function notify(message: string): Promise<NotifyResult>
export async function notify(optionsOrMessage: NotifyOptions | string): Promise<NotifyResult> {
  const options: NotifyOptions =
    typeof optionsOrMessage === 'string'
      ? { message: optionsOrMessage }
      : optionsOrMessage

  const errors: string[] = []
  let telegramOk = false
  let whatsappOk = false

  // Telegram (non-bloquant)
  try {
    telegramOk = await sendTelegram(options.message)
  } catch (err: any) {
    errors.push(`Telegram: ${err.message}`)
  }

  // WhatsApp (non-bloquant)
  try {
    whatsappOk = await sendWhatsApp(options.message)
  } catch (err: any) {
    errors.push(`WhatsApp: ${err.message}`)
  }

  return {
    telegram: telegramOk,
    whatsapp: whatsappOk,
    errors,
  }
}

// ============================================================
// Helper : notifie les admins (pour erreurs critiques, etc.)
// ============================================================
export async function notifyAdmin(message: string): Promise<void> {
  const prefixed = `🚨 DataSphere Alert\n\n${message}`
  await notify({ message: prefixed, force: true })
}

// ============================================================
// Helper : notifie succès (post publié, etc.)
// ============================================================
export async function notifySuccess(message: string): Promise<void> {
  const prefixed = `✅ DataSphere\n\n${message}`
  await notify(prefixed)
}

// ============================================================
// Helper : notifie info
// ============================================================
export async function notifyInfo(message: string): Promise<void> {
  const prefixed = `ℹ️ DataSphere\n\n${message}`
  await notify(prefixed)
}

// ============================================================
// Status des canaux (pour /api/health)
// ============================================================
export function getMessagingStatus() {
  return {
    telegram: {
      configured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    },
    whatsapp: {
      configured: !!(process.env.WHATSAPP_CALLMEBOT_KEY && process.env.WHATSAPP_PHONE),
    },
  }
}
