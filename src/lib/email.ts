// ============================================================
// Email Service - Emails transactionnels (Resend)
//
// En production : créer un compte sur https://resend.com
// Définir RESEND_API_KEY dans les env vars
//
// Si Resend n'est pas configuré, les emails sont loggés (dev mode)
// ============================================================

import { getAppUrl } from '@/lib/app-url'

const FROM_EMAIL = process.env.EMAIL_FROM || process.env.FROM_EMAIL || 'DataSphere <noreply@datasphere.app>'

// Récupère l'URL de l'app dynamiquement (gère RENDER_EXTERNAL_URL automatiquement)
function getAppUrlForEmail(): string {
  return getAppUrl()
}

interface EmailPayload {
  to: string
  subject: string
  html: string
}

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Dev mode : juste log l'email
    console.log('[EMAIL (dev mode)]', { to: payload.to, subject: payload.subject })
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[Resend] Failed to send email:', err)
      return false
    }

    return true
  } catch (err: any) {
    console.error('[Resend] Error:', err.message)
    return false
  }
}

// ============================================================
// Email : bienvenue après inscription
// ============================================================
export async function sendWelcomeEmail(to: string, name: string | null): Promise<void> {
  const firstName = name?.split(' ')[0] || 'cher utilisateur'
  await sendEmail({
    to,
    subject: 'Bienvenue sur DataSphere 🎉',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #6366f1 100%); color: white; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Bienvenue ${firstName} !</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">Votre essai Pro de 14 jours a commencé</p>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p>Vous pouvez maintenant :</p>
          <ul style="color: #475569; padding-left: 20px;">
            <li>Connecter votre compte LinkedIn</li>
            <li>Générer des posts avec l'IA</li>
            <li>Publier automatiquement sur LinkedIn</li>
            <li>Suivre vos analytics en temps réel</li>
          </ul>
          <a href="${getAppUrlForEmail()}/onboarding" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; font-weight: 500;">Commencer l'onboarding</a>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">Si le bouton ne fonctionne pas, copiez ce lien : ${getAppUrlForEmail()}/onboarding</p>
        </div>
      </div>
    `,
  })
}

// ============================================================
// Email : essai expire dans 3 jours
// ============================================================
export async function sendTrialExpiringEmail(
  to: string,
  daysLeft: number,
  trialEndsAt: Date
): Promise<void> {
  await sendEmail({
    to,
    subject: `Votre essai DataSphere expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <div style="background: #fef3c7; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; color: #92400e;">⏰ Plus que ${daysLeft} jour${daysLeft > 1 ? 's' : ''} d'essai</h1>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p>Votre essai Pro se termine le <strong>${trialEndsAt.toLocaleDateString('fr-FR')}</strong>.</p>
          <p>Pour continuer à profiter de DataSphere sans interruption, passez à l'offre Pro (29€/mois) ou Business (79€/mois).</p>
          <a href="${getAppUrlForEmail()}/pricing" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; font-weight: 500;">Voir les offres</a>
        </div>
      </div>
    `,
  })
}

// ============================================================
// Email : invitation à rejoindre une team
// ============================================================
export async function sendTeamInvitationEmail(params: {
  to: string
  teamName: string
  inviterName: string
  invitationToken: string
  isNewUser: boolean
}): Promise<void> {
  const { to, teamName, inviterName, invitationToken, isNewUser } = params
  const acceptUrl = `${getAppUrlForEmail()}/team/invite?token=${invitationToken}`

  await sendEmail({
    to,
    subject: `${inviterName} vous invite à rejoindre "${teamName}" sur DataSphere`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Vous êtes invité !</h1>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p><strong>${inviterName}</strong> vous invite à rejoindre l'équipe <strong>"${teamName}"</strong> sur DataSphere.</p>
          ${isNewUser
            ? '<p>Vous devrez créer un compte DataSphere pour accepter l\'invitation.</p>'
            : '<p>Connectez-vous à votre compte DataSphere pour accepter.</p>'}
          <a href="${acceptUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; font-weight: 500;">Accepter l'invitation</a>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">Cette invitation expire dans 7 jours.</p>
        </div>
      </div>
    `,
  })
}
