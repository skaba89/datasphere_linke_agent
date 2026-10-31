import { generateChat } from '@/lib/ai-providers'

// ============================================================
// AI Service - Génération de posts LinkedIn via LLM
//
// Supporte plusieurs providers via ai-providers.ts :
//   Gemini, GLM, Groq, OpenRouter, fallback z-ai-web-dev-sdk
// ============================================================

export interface GenerateParams {
  topics: string
  tone: string
  targetAudience: string
  language: string
  count?: number
}

export interface GeneratedPost {
  title: string
  content: string
  hashtags: string
  format: string
  angle: string
  targetAudience: string
  qualityScore: number
  optimalTime: string
  engagementEst: string
}

// ============================================================
// Prompt structuré pour générer N posts LinkedIn
// ============================================================
const SYSTEM_PROMPT = `Tu es un expert en création de contenu LinkedIn B2B avec 10 ans d'expérience.
Tu génères des posts LinkedIn engageants qui maximisent l'engagement (likes, commentaires, partages).

RÈGLES STRICTES :
- Format : accroche puissante (1ère ligne), corps (paragraphes courts de 2-3 lignes max), CTA final
- Utilise des émojis avec parcimonie (3-5 max par post)
- 3-5 hashtags pertinents en fin de post
- Pas de jargon technique, pas de liens externes
- Ton authentique et personnel (première personne)
- 800-1500 caractères par post

Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.`

function buildUserPrompt(params: GenerateParams): string {
  const count = params.count || 3
  return `Génère ${count} posts LinkedIn distincts sur les sujets suivants : "${params.topics}".

Audience cible : ${params.targetAudience}
Ton éditorial : ${params.tone}
Langue : ${params.language === 'fr' ? 'français' : params.language}

Diversifie les angles (storytelling, opinion, tuto, question provocatrice, liste, data).
Optimal time : heure de publication idéale (HH:MM).
QualityScore : score de qualité estimé sur 10 (basé sur accroche, structure, CTA).
EngagementEst : estimation textuelle (ex: "Élevé - 200-400 likes").

Format de réponse (JSON valide uniquement) :
{
  "posts": [
    {
      "title": "Titre interne court (non visible dans le post)",
      "content": "Texte complet du post LinkedIn",
      "hashtags": "#hashtag1 #hashtag2 #hashtag3",
      "format": "Storytelling|Liste|Tuto|Question|Opinion|Data",
      "angle": "inspirant|éducatif|provocateur|expert|humain",
      "targetAudience": "${params.targetAudience}",
      "qualityScore": 8.5,
      "optimalTime": "09:00",
      "engagementEst": "Élevé - 200-400 likes"
    }
  ]
}`
}

export async function generateLinkedInPosts(params: GenerateParams): Promise<GeneratedPost[]> {
  const result = await generateChat({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(params),
    temperature: 0.7,
    maxTokens: 4000,
  })

  const raw = result.content
  if (!raw) {
    throw new Error('Réponse IA vide')
  }

  // Extraction du JSON (l'IA peut wrapper dans ```json ... ```)
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Réponse IA invalide (JSON non trouvé)')
  }

  let parsed: { posts: GeneratedPost[] }
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch (e: any) {
    throw new Error(`JSON invalide: ${e.message}`)
  }

  if (!parsed.posts || !Array.isArray(parsed.posts) || parsed.posts.length === 0) {
    throw new Error('Aucun post généré')
  }

  // Validation + sanitization
  return parsed.posts.map((p) => ({
    title: String(p.title || 'Sans titre').slice(0, 200),
    content: String(p.content || '').slice(0, 5000),
    hashtags: String(p.hashtags || '').slice(0, 300),
    format: String(p.format || 'text').slice(0, 50),
    angle: String(p.angle || '').slice(0, 50),
    targetAudience: String(p.targetAudience || params.targetAudience).slice(0, 200),
    qualityScore: typeof p.qualityScore === 'number' ? Math.min(10, Math.max(0, p.qualityScore)) : 7,
    optimalTime: String(p.optimalTime || '09:00').slice(0, 10),
    engagementEst: String(p.engagementEst || '').slice(0, 100),
  }))
}

// ============================================================
// Amélioration d'un post existant (réécriture)
// ============================================================
export async function improvePost(content: string, instruction: string): Promise<string> {
  const result = await generateChat({
    system: `Tu es un expert en réécriture de posts LinkedIn. Améliore le post fourni selon l'instruction. Garde le ton authentique. Réponds uniquement avec le post amélioré, sans commentaire.`,
    user: `Post original :\n\n${content}\n\nInstruction : ${instruction}`,
    temperature: 0.7,
    maxTokens: 2000,
  })

  return result.content || content
}
