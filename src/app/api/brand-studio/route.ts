import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { generateChat } from '@/lib/ai-providers'
import { db } from '@/lib/db'

// ============================================================
// POST /api/brand-studio
// AI Personal Brand Studio
//
// Analyse le profil et génère une "voix éditoriale" personnalisée
// Body: { samples?: string[], domain?: string, audience?: string, goals?: string }
// ============================================================

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { samples, domain, audience, goals } = body

    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return NextResponse.json({ success: false, error: 'Au moins un exemple de contenu est requis' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })

    const result = await generateChat({
      system: `Tu es un expert en personal branding LinkedIn. Tu analyses le style d'écriture d'une personne à partir de ses posts existants et tu crées un "profil éditorial" complet.

Réponds UNIQUEMENT en JSON valide :
{
  "voiceProfile": {
    "tone": "description du ton (ex: direct, authentique, pédagogique)",
    "style": "description du style (ex: phrases courtes, storytelling, data-driven)",
    "vocabulary": ["mots-clés récurrents"],
    "structure": "structure type des posts (ex: accroche → histoire → leçon → CTA)",
    "emoji": "usage d'émojis (fréquent, rare, aucun)",
    "ctStyle": "style d'appel à l'action (question, invitation, challenge)"
  },
  "strengths": ["points forts du contenu"],
  "improvements": ["axes d'amélioration"],
  "contentPillars": ["3-5 piliers éditoriaux recommandés"],
  "samplePost": "un post d'exemple généré dans le style de l'utilisateur"
}`,
      user: `Analyse le style éditorial de ${user?.name || 'cet utilisateur'}.

DOMAINES D'EXPERTISE: ${domain || 'Non spécifié'}
AUDIENCE CIBLE: ${audience || 'Non spécifié'}
OBJECTIFS: ${goals || 'Non spécifié'}

EXEMPLES DE CONTENU (${samples.length} posts):
${samples.slice(0, 5).map((s: string, i: number) => `--- Post ${i + 1} ---\n${s.slice(0, 1000)}`).join('\n\n')}

Génère le profil éditorial complet.`,
      temperature: 0.6,
      maxTokens: 2000,
    })

    let parsed
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
      else parsed = { raw: result.content }
    } catch { parsed = { raw: result.content } }

    return NextResponse.json({ success: true, data: parsed, provider: result.provider })
  } catch (error: any) {
    console.error('[POST /api/brand-studio]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
