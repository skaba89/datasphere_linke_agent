import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { generateChat } from '@/lib/ai-providers'

// ============================================================
// POST /api/ai/crm-copilot
// AI CRM Copilot — Agent IA avec contexte CRM complet
//
// L'utilisateur peut poser une question et l'IA répond en
// connaissant :
//   - Ses prospects (top 10 récents + par stage)
//   - Ses clients (avec performance)
//   - Ses derniers messages CRM
//   - Ses derniers posts publiés
//
// Body: { message: string, contextProspectId?: string }
//
// Plan gate: Pro+
// ============================================================

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    // Plan gating
    const user = await db.user.findUnique({ where: { id: userId }, select: { plan: true, role: true } })
    const plan = (user?.plan || 'free').toLowerCase()
    const isAdmin = user?.role === 'admin'
    if (!isAdmin && plan !== 'pro' && plan !== 'business' && plan !== 'agency') {
      return NextResponse.json(
        { success: false, error: 'CRM Copilot IA est réservé aux plans Pro et supérieurs.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { message, contextProspectId } = body
    if (!message || typeof message !== 'string' || message.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Message requis (2 caractères min.)' }, { status: 400 })
    }
    if (message.length > 4000) {
      return NextResponse.json({ success: false, error: 'Message trop long (4000 caractères max.)' }, { status: 400 })
    }

    // ─── Récupérer le contexte CRM ───
    const [prospects, clients, recentMessages, recentPosts] = await Promise.all([
      db.prospect.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { id: true, name: true, title: true, company: true, email: true, stage: true, tags: true, notes: true, linkedinUrl: true },
      }),
      db.client.findMany({
        where: { userId },
        select: {
          id: true, name: true, active: true, monthlyGoal: true,
          _count: { select: { posts: true } },
        },
      }),
      db.crmMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, subject: true, body: true, status: true, createdAt: true,
          prospect: { select: { name: true } },
        },
      }),
      db.postProposal.findMany({
        where: { userId, status: 'published' },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, publishedAt: true, engagementEst: true },
      }),
    ])

    // Si contextProspectId fourni, récupérer ce prospect spécifique + ses messages
    let focusedProspect: Awaited<ReturnType<typeof db.prospect.findFirst<{ include: { messages: true } }>>> = null
    let focusedMessages: Array<{ id: string; subject: string; body: string; status: string; createdAt: Date; sentAt: Date | null }> = []
    if (contextProspectId) {
      const found = await db.prospect.findFirst({
        where: { id: contextProspectId, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, subject: true, body: true, status: true, createdAt: true, sentAt: true },
          },
        },
      })
      if (found) {
        focusedProspect = found as any
        focusedMessages = (found as any).messages
      }
    }

    // ─── Statistiques agrégées ───
    const stageCounts: Record<string, number> = {}
    for (const p of prospects) {
      stageCounts[p.stage] = (stageCounts[p.stage] || 0) + 1
    }

    // ─── Construire le prompt ───
    const prospectsList = prospects.map(p => {
      const parts = [p.name]
      if (p.title) parts.push(p.title)
      if (p.company) parts.push(`@ ${p.company}`)
      parts.push(`[${p.stage}]`)
      if (p.tags) parts.push(`tags: ${p.tags}`)
      if (p.notes) parts.push(`notes: "${p.notes.slice(0, 100)}"`)
      return `• ${parts.join(' | ')}`
    }).join('\n') || 'Aucun prospect'

    const clientsList = clients.map(c =>
      `• ${c.name} | ${c.active ? 'actif' : 'inactif'} | ${c._count.posts} posts | objectif: ${c.monthlyGoal}/mois`
    ).join('\n') || 'Aucun client'

    const messagesList = recentMessages.map(m =>
      `• ${m.prospect?.name || '?'} — "${m.subject}" (${m.status}, ${new Date(m.createdAt).toLocaleDateString('fr-FR')})`
    ).join('\n') || 'Aucun message récent'

    const postsList = recentPosts.map(p =>
      `• "${p.title}" (${new Date(p.publishedAt || Date.now()).toLocaleDateString('fr-FR')}, engagement: ${p.engagementEst || 'N/A'})`
    ).join('\n') || 'Aucun post publié'

    let focusSection = ''
    if (focusedProspect) {
      focusSection = `\n\n## CONTEXTE PROSPECT FOCUS\n` +
        `Nom: ${focusedProspect.name}\n` +
        `Titre: ${focusedProspect.title || 'N/A'}\n` +
        `Entreprise: ${focusedProspect.company || 'N/A'}\n` +
        `Stage: ${focusedProspect.stage}\n` +
        `LinkedIn: ${focusedProspect.linkedinUrl || 'N/A'}\n` +
        `Tags: ${focusedProspect.tags || 'aucun'}\n` +
        `Notes: ${focusedProspect.notes || 'aucune'}\n\n` +
        `Historique des messages (${focusedMessages.length}):\n` +
        (focusedMessages.map(m =>
          `  - [${m.status}] ${m.subject} (${new Date(m.createdAt).toLocaleDateString('fr-FR')}) — ${m.body.slice(0, 150)}${m.body.length > 150 ? '...' : ''}`
        ).join('\n') || '  Aucun message')
    }

    const result = await generateChat({
      system: `Tu es un CRM Copilot IA expert en LinkedIn B2B. Tu aides l'utilisateur à :
- Analyser son pipeline de prospects
- Rédiger des messages de suivi personnalisés
- Identifier les opportunités (prospects à relancer, prospects chauds)
- Suggérer des actions concrètes (relances, contenu, mises en relation)
- Optimiser sa stratégie d'engagement

Réponds en français, de manière concise et actionnable. Quand tu proposes un message ou un template, formatte-le clairement entre séparateurs (---). Quand tu identifies une opportunité ou un risque, mentionne-le explicitement.

IMPORTANT : Tes recommandations doivent être basées sur les données réelles du CRM ci-dessous.`,
      user: `## DONNÉES CRM ACTUELLES

### Pipeline prospects (top 10 récents, ${prospects.length} au total)
${prospectsList}

### Distribution par stage
${Object.entries(stageCounts).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '- Aucun'}

### Clients (${clients.length})
${clientsList}

### Derniers messages CRM
${messagesList}

### Derniers posts publiés
${postsList}
${focusSection}

## QUESTION DE L'UTILISATEUR

${message}

Réponds en utilisant les données CRM ci-dessus. Sois précis et cite les prospects/clients par leur nom quand pertinent.`,
      temperature: 0.5,
      maxTokens: 1200,
    })

    return NextResponse.json({
      success: true,
      data: {
        content: result.content,
        provider: result.provider,
      },
      meta: {
        prospectsContextCount: prospects.length,
        clientsContextCount: clients.length,
        focusedProspect: focusedProspect?.name || null,
      },
    })
  } catch (error: any) {
    console.error('[POST /api/ai/crm-copilot]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
