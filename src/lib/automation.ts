import { db } from '@/lib/db'
import { generateChat } from '@/lib/ai-providers'
import { createNotification } from '@/lib/notifications'

// ============================================================
// Automation Service - IA qui répond comme un humain expert
//
// Principes clés pour un ton HUMAIN (pas robotique) :
//   1. Pas de "En tant que..." ou "Je suis ravi de..."
//   2. Réponses courtes, naturelles, conversationnelles
//   3. Utilise le prénom du commentateur
//   4. Pose des questions pour relancer la conversation
//   5. Varie les formulations (pas de templates répétitifs)
//   6. Adapte le ton au sentiment du commentaire
//   7. Évite les émojis systématiques
//   8. Référence parfois le contenu du post pour montrer qu'on a lu
// ============================================================

// ─── Prompt pour réponses aux commentaires ───
const COMMENT_REPLY_SYSTEM = `Tu es un expert LinkedIn qui répond aux commentaires de SES propres posts. Tu réponds COMME UN HUMAIN, pas comme un bot.

RÈGLES STRICTES :
- Réponse COURTE (1-3 phrases max), naturelle, conversationnelle
- Utilise le prénom de la personne si tu le connais
- JAMAIS de formules robotiques : "Merci pour votre commentaire", "Je suis ravi de...", "En tant que...", "N'hésitez pas à..."
- JAMAIS d'émojis sauf si le commentateur en utilise (alors 1 max, naturel)
- Varie tes réponses : ne répète jamais la même structure
- Si le commentaire est une question → réponds directement et simplement
- Si c'est un compliment → remercie brièvement et ajoute une pensée perso
- Si c'est un désaccord → respecte l'opinion, donne ton angle sans agresser
- Si c'est négatif → reste calme, factuel, propose d'en discuter en DM
- Pose parfois une question pour relancer (mais pas toujours)
- Parle à la première personne ("je", "mon expérience")
- Écris comme tu parlerais à un collègue, pas à un client

EXEMPLES de BONNES réponses :
- "Tout à fait d'accord Marie. J'ai vu ça sur mon dernier projet aussi, le changement de cap a pris 3 mois."
- "Bonne question. En fait ça dépend de ta taille d'équipe. Pour une PME je dirais commence petit."
- "Merci Thomas ! Honnêtement c'était un apprentissage à l'arrache, je partage pour éviter à d'autres de galérer."

EXEMPLES de MAUVAISES réponses (INTERDIT) :
- "Merci pour votre commentaire très pertinent ! 🙏 N'hésitez pas à me contacter pour en discuter."
- "En tant qu'expert, je confirme que..."
- "Je suis ravi que vous ayez apprécié mon contenu !"

Réponds UNIQUEMENT avec le texte de la réponse, sans guillemets, sans préfixe.`

// ─── Prompt pour messages de prospection ───
const OUTREACH_SYSTEM = `Tu es un expert LinkedIn qui écrit des messages de prospection PERSONNELS. Tu écris COMME UN HUMAIN qui contacte quelqu'un pour la première fois.

RÈGLES STRICTES :
- Message court (3-5 lignes max)
- Personnalisation RÉELLE basée sur le profil (entreprise, titre)
- Pas de pitch commercial au premier message
- Ton naturel, comme si tu écrivais à un connaissanc
- Pose une question ouverte pour inviter la réponse
- JAMAIS de "Cher", "Bonjour cher", "Je me permets de vous contacter"
- Utilise "tu" (ton professionnel mais direct, typique LinkedIn FR)
- Évite les émojis
- Sois authentique : partage pourquoi tu contacts CETTE personne

EXEMPLE bon :
"Salut Thomas, j'ai vu ton post sur le scaling B2B la semaine dernière — vraiment pertinent. Je galère actuellement sur le même sujet avec mon équipe de 5. Tu aurais 15 min la semaine pro pour échanger ?"

EXEMPLE mauvais :
"Bonjour, je suis ravi de vous contacter. Notre solution révolutionnaire permet de..."`

// ─── Prompt pour follow-up ───
const FOLLOWUP_SYSTEM = `Tu écris un message de relance LinkedIn (follow-up). La personne n'a pas répondu au premier message.

RÈGLES :
- Ultra court (1-2 lignes)
- Pas de culpabilisation ("Pourquoi n'avez-vous pas répondu")
- Pas de "Juste un petit rappel"
- Apporte de la valeur : un lien, une info, une question différente
- Ton détendu, comme si de rien n'était
- Donne une "excuse" naturelle au contact (nouveau post, actualité)

EXEMPLE bon :
"Je viens de publier un retour d'expérience sur le sujet dont on avait parlé — ça pourrait t'intéresser : [lien]"

EXEMPLE mauvais :
"Bonjour, je me permets de vous relancer concernant mon précédent message..."`

// ============================================================
// Générer une réponse à un commentaire
// ============================================================
export async function generateCommentReply(params: {
  commenterName: string
  commenterText: string
  postContent: string
  userTone: string
}): Promise<{ reply: string; sentiment: string }> {
  const userPrompt = `Quelqu'un a commenté mon post LinkedIn. Génère une réponse naturelle.

MON POST (extrait) :
${params.postContent.slice(0, 500)}

COMMENTAIRE de ${params.commenterName} :
"${params.commenterText}"

Mon ton habituel : ${params.userTone}

Génère d'abord une analyse du sentiment (positive/neutral/negative) puis la réponse.
Format : SENTIMENT:xxx
RÉPONSE:ta réponse ici`

  const result = await generateChat({
    system: COMMENT_REPLY_SYSTEM,
    user: userPrompt,
    temperature: 0.8,
    maxTokens: 300,
  })

  const content = result.content

  // Parser le sentiment + la réponse
  let sentiment = 'neutral'
  let reply = content

  const sentimentMatch = content.match(/SENTIMENT:\s*(\w+)/i)
  if (sentimentMatch) {
    sentiment = sentimentMatch[1].toLowerCase()
  }

  const replyMatch = content.match(/RÉPONSE:\s*([\s\S]+)/i)
  if (replyMatch) {
    reply = replyMatch[1].trim()
  }

  // Nettoyer les guillemets si présents
  reply = reply.replace(/^["'»]|["'»]$/g, '').trim()

  return { reply, sentiment }
}

// ============================================================
// Générer un message de prospection personnalisé
// ============================================================
export async function generateOutreachMessage(params: {
  prospectName: string
  prospectTitle?: string
  prospectCompany?: string
  userContext: string
  connectionType: 'first_contact' | 'follow_up' | 're_engage'
}): Promise<string> {
  const system = params.connectionType === 'follow_up' ? FOLLOWUP_SYSTEM : OUTREACH_SYSTEM

  const userPrompt = `Écris un message LinkedIn pour ${params.connectionType === 'follow_up' ? 'relancer' : 'contacter'} cette personne.

DESTINATAIRE :
- Nom : ${params.prospectName}
- Titre : ${params.prospectTitle || 'Non spécifié'}
- Entreprise : ${params.prospectCompany || 'Non spécifié'}

MON CONTEXTE (ce que je fais, pourquoi je contacte) :
${params.userContext}

${params.connectionType === 'follow_up' ? "C'est une RELANCE — la personne n'a pas répondu au premier message. Apporte quelque chose de neuf." : "C'est le PREMIER contact. Pas de pitch. Objectif : créer une connection naturelle."}

Réponds UNIQUEMENT avec le message, sans guillemets ni préfixe.`

  const result = await generateChat({
    system,
    user: userPrompt,
    temperature: 0.85,
    maxTokens: 400,
  })

  return result.content.replace(/^["'»]|["'»]$/g, '').trim()
}

// ============================================================
// Traiter les commentaires en attente
// (appelé par cron ou manuellement)
// ============================================================
export async function processPendingComments(userId: string): Promise<{ processed: number; generated: number }> {
  // Récupérer les réponses en attente qui n'ont pas encore de réponse générée
  const pending = await db.commentReply.findMany({
    where: { userId, status: 'pending', generatedReply: '' },
    take: 20,
  })

  let generated = 0
  for (const comment of pending) {
    try {
      // Récupérer le contenu du post si disponible
      let postContent = ''
      if (comment.postProposalId) {
        const post = await db.postProposal.findUnique({
          where: { id: comment.postProposalId },
          select: { content: true },
        })
        postContent = post?.content || ''
      }

      // Récupérer le ton de l'utilisateur
      const settings = await db.smartPosterSettings.findUnique({
        where: { userId },
        select: { tone: true },
      })

      const { reply, sentiment } = await generateCommentReply({
        commenterName: comment.commenterName,
        commenterText: comment.commenterText,
        postContent,
        userTone: settings?.tone || 'Professionnel mais accessible',
      })

      await db.commentReply.update({
        where: { id: comment.id },
        data: { generatedReply: reply, sentiment },
      })

      // Notifier l'utilisateur qu'une réponse est prête
      await createNotification({
        userId,
        type: 'ai',
        title: 'Nouvelle réponse suggérée',
        message: `${comment.commenterName} a commenté. Réponse IA prête à valider.`,
        link: '/?tab=comment-replies',
      })

      generated++
    } catch (err: any) {
      console.error(`[Automation] Failed to generate reply for comment ${comment.id}:`, err.message)
    }
  }

  return { processed: pending.length, generated }
}

// ============================================================
// Exécuter les séquences CRM automatisées
// (vérifie chaque jour quels messages de séquence doivent être envoyés)
// ============================================================
export async function processCrmSequences(userId: string): Promise<{ sent: number; failed: number }> {
  // Récupérer les prospects avec une séquence active
  const prospects = await db.prospect.findMany({
    where: {
      userId,
      stage: { in: ['new', 'contacted', 'replied'] },
    },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  let sent = 0
  let failed = 0

  for (const prospect of prospects) {
    const lastMessage = prospect.messages[0]
    if (!lastMessage) continue

    const daysSinceLastContact = Math.floor(
      (Date.now() - new Date(lastMessage.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )

    // Récupérer la séquence associée
    if (!lastMessage.sequenceId) continue
    const sequence = await db.crmSequence.findUnique({
      where: { id: lastMessage.sequenceId },
    })
    if (!sequence || !sequence.active) continue

    const steps = sequence.steps as any[]
    const nextStepIndex = (lastMessage.stepIndex || 0) + 1
    const nextStep = steps[nextStepIndex]

    if (!nextStep) continue // séquence terminée
    if (daysSinceLastContact < (nextStep.day || 3)) continue // pas encore le moment

    try {
      // Générer le message avec l'IA (ton humain)
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      })
      const settings = await db.smartPosterSettings.findUnique({
        where: { userId },
        select: { topics: true, tone: true },
      })

      const message = await generateOutreachMessage({
        prospectName: prospect.name,
        prospectTitle: prospect.title || undefined,
        prospectCompany: prospect.company || undefined,
        userContext: settings?.topics || 'Marketing digital et IA',
        connectionType: nextStepIndex === 0 ? 'first_contact' : 'follow_up',
      })

      // Créer le message en DB (statut draft pour validation manuelle)
      await db.crmMessage.create({
        data: {
          userId,
          prospectId: prospect.id,
          sequenceId: sequence.id,
          stepIndex: nextStepIndex,
          subject: nextStep.subject || `Message ${nextStepIndex + 1}`,
          body: message,
          status: 'draft',
        },
      })

      // Notifier l'utilisateur
      await createNotification({
        userId,
        type: 'ai',
        title: 'Message de séquence généré',
        message: `Message ${nextStepIndex + 1} pour ${prospect.name} prêt à envoyer.`,
        link: '/?tab=messages',
      })

      // Log
      await db.automationLog.create({
        data: {
          userId,
          type: 'sequence_email',
          action: 'generated',
          details: JSON.stringify({ prospectId: prospect.id, stepIndex: nextStepIndex }),
        },
      })

      sent++
    } catch (err: any) {
      console.error(`[Automation] Failed to process sequence for ${prospect.id}:`, err.message)
      failed++
    }
  }

  return { sent, failed }
}
