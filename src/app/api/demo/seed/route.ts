import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// POST /api/demo/seed
// Crée des données de démonstration : 2 clients + ~32 posts
// ============================================================

const DEMO_CLIENTS = [
  { name: 'Team DataSphere', color: '#10b981', monthlyGoal: 20 },
  { name: 'Team Daf', color: '#6366f1', monthlyGoal: 20 },
]

const DEMO_POSTS = [
  { title: "5 erreurs fatales que les professionnels commettent le lundi matin", status: 'published', daysAgo: 8 },
  { title: "J'ai démissionné pour un meilleur salaire", status: 'published', daysAgo: 8 },
  { title: "J'ai investi 10 000€ dans l'IA qui a échoué", status: 'published', daysAgo: 8 },
  { title: "Le secret du networking que personne ne partage", status: 'failed', daysAgo: 20 },
  { title: "Pourquoi 90% des entrepreneurs ratent leur contenu", status: 'failed', daysAgo: 20 },
  { title: "Comment j'ai doublé mon engagement en 30 jours", status: 'published', daysAgo: 15 },
  { title: "3 leçons de mon échec entrepreneurial", status: 'published', daysAgo: 12 },
  { title: "L'IA va-t-elle remplacer les marketeurs ?", status: 'approved', daysAgo: 1 },
  { title: "Mon framework pour des posts LinkedIn viraux", status: 'pending', daysAgo: 0 },
  { title: "Pourquoi je recommande d'automatiser son LinkedIn", status: 'pending', daysAgo: 0 },
]

const EXTRA_POSTS = [
  "L'art de l'accroche LinkedIn",
  "Pourquoi je publie tous les jours",
  "Mon routine matinale de création",
  "3 outils IA que j'utilise quotidiennement",
  "Comment gérer le syndrome de l'imposteur",
  "Le pouvoir du storytelling en B2B",
  "Pourquoi votre réseau LinkedIn est votre meilleur atout",
  "5 habitudes des créateurs de contenu réussis",
  "L'importance de la régularité sur LinkedIn",
  "Comment transformer un échec en opportunité",
  "Le futur du marketing B2B",
  "Mon processus de création de contenu en 5 étapes",
  "Pourquoi l'authenticité bat la perfection",
  "3 erreurs qui tuent votre reach LinkedIn",
  "Comment utiliser l'IA sans perdre votre voix",
  "Le guide du débutant sur LinkedIn",
  "Pourquoi je réponds à tous les commentaires",
  "Mon setup de productivité pour LinkedIn",
  "Comment mesurer le ROI de votre présence LinkedIn",
  "3 frameworks pour structurer vos posts",
  "L'importance du premier commentaire",
  "Pourquoi les posts courts fonctionnent mieux",
]

export async function POST() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const existingClients = await db.client.count({ where: { userId } })
    if (existingClients > 0) {
      return NextResponse.json({ success: false, error: 'Vous avez déjà des clients. Supprimez-les avant de re-seed.' }, { status: 400 })
    }

    const createdClients: Awaited<ReturnType<typeof db.client.create>>[] = []
    for (const c of DEMO_CLIENTS) {
      const client = await db.client.create({ data: { userId, name: c.name, color: c.color, monthlyGoal: c.monthlyGoal } })
      createdClients.push(client)
    }

    const now = new Date()
    let postCount = 0

    // Posts principaux
    for (let i = 0; i < DEMO_POSTS.length; i++) {
      const post = DEMO_POSTS[i]
      const client = createdClients[i % 2]
      const createdAt = new Date(now)
      createdAt.setDate(createdAt.getDate() - post.daysAgo)

      await db.postProposal.create({
        data: {
          userId, clientId: client.id,
          title: post.title,
          content: `${post.title}\n\nCeci est un post de démonstration LinkedInPost.\n\n#LinkedInPost #IA`,
          hashtags: '#LinkedInPost #IA',
          format: 'texte', angle: 'démo', targetAudience: 'professionnels LinkedIn',
          qualityScore: 7.5 + Math.random() * 2,
          optimalTime: '09:00', status: post.status, engagementEst: 'Élevé',
          publishedAt: post.status === 'published' ? new Date(createdAt) : null,
          createdAt,
        },
      })
      postCount++
    }

    // Posts supplémentaires
    for (let i = 0; i < EXTRA_POSTS.length; i++) {
      const client = createdClients[i % 2]
      const daysAgo = Math.floor(Math.random() * 30) + 1
      const createdAt = new Date(now)
      createdAt.setDate(createdAt.getDate() - daysAgo)
      const isPublished = Math.random() > 0.3

      await db.postProposal.create({
        data: {
          userId, clientId: client.id,
          title: EXTRA_POSTS[i],
          content: `${EXTRA_POSTS[i]}\n\nPost de démonstration LinkedInPost.`,
          hashtags: '#LinkedInPost #Démo',
          format: 'texte', angle: 'démo', targetAudience: 'professionnels LinkedIn',
          qualityScore: 7 + Math.random() * 3,
          optimalTime: '09:00',
          status: isPublished ? 'published' : (Math.random() > 0.5 ? 'approved' : 'pending'),
          engagementEst: 'Élevé',
          publishedAt: isPublished ? new Date(createdAt) : null,
          createdAt,
        },
      })
      postCount++
    }

    return NextResponse.json({
      success: true,
      data: { clientsCreated: createdClients.length, postsCreated: postCount },
    }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/demo/seed]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
