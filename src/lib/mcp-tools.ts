import { db } from '@/lib/db'

// ============================================================
// MCP (Model Context Protocol) Tools
//
// Définit les tools exposés par le serveur MCP de DataSphere.
// Chaque tool a : name, description, inputSchema (JSON Schema),
// et un handler qui reçoit (userId, args) et retourne un résultat.
//
// Les tools sont accessibles via /api/mcp avec auth API key.
// ============================================================

export interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  handler: (userId: string, args: Record<string, any>) => Promise<McpToolResult>
}

export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

function textResult(text: string, isError = false): McpToolResult {
  return { content: [{ type: 'text', text }], isError }
}

function jsonResult(data: any, isError = false): McpToolResult {
  return textResult(JSON.stringify(data, null, 2), isError)
}

// ============================================================
// Tool definitions
// ============================================================
export const MCP_TOOLS: McpTool[] = [
  // ─── Posts ───
  {
    name: 'list_posts',
    description: 'Liste les posts/propositions LinkedIn de l\'utilisateur. Retourne id, titre, statut, date de création.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filtrer par statut: pending | approved | published | rejected | failed' },
        limit: { type: 'number', description: 'Nombre max de résultats (défaut: 20, max: 100)' },
      },
    },
    handler: async (userId, args) => {
      const limit = Math.min(args.limit || 20, 100)
      const where: any = { userId }
      if (args.status) where.status = args.status
      const posts = await db.postProposal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, title: true, status: true, format: true, createdAt: true, publishedAt: true, engagementEst: true },
      })
      return jsonResult({ count: posts.length, posts })
    },
  },
  {
    name: 'get_post',
    description: 'Récupère les détails d\'un post spécifique par son ID (contenu complet, hashtags, etc.).',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'ID du post' } },
      required: ['id'],
    },
    handler: async (userId, args) => {
      const post = await db.postProposal.findFirst({
        where: { id: args.id, userId },
      })
      if (!post) return textResult('Post introuvable', true)
      return jsonResult(post)
    },
  },
  {
    name: 'create_post',
    description: 'Crée un brouillon de post LinkedIn (statut=pending). L\'utilisateur devra l\'approuver avant publication.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titre du post' },
        content: { type: 'string', description: 'Contenu textuel du post' },
        hashtags: { type: 'string', description: 'Hashtags séparés par des espaces (ex: #marketing #ia)' },
        format: { type: 'string', description: 'Format: short | list | question | long-form' },
        clientId: { type: 'string', description: 'ID du client (agence) auquel associer le post' },
      },
      required: ['title', 'content'],
    },
    handler: async (userId, args) => {
      if (!args.title || args.title.trim().length < 3) {
        return textResult('Titre requis (3 caractères min.)', true)
      }
      if (!args.content || args.content.trim().length < 10) {
        return textResult('Contenu requis (10 caractères min.)', true)
      }
      const post = await db.postProposal.create({
        data: {
          userId,
          title: args.title.trim().slice(0, 200),
          content: args.content.slice(0, 5000),
          hashtags: args.hashtags || '',
          format: args.format || 'short',
          angle: 'mcp',
          targetAudience: 'MCP',
          qualityScore: 5.0,
          optimalTime: 'manual',
          engagementEst: 'pending',
          status: 'pending', // anti-bypass: toujours pending
          clientId: args.clientId || null,
        },
      })
      return jsonResult({ success: true, id: post.id, status: post.status, message: 'Brouillon créé. L\'utilisateur doit l\'approuver avant publication.' })
    },
  },

  // ─── Prospects / CRM ───
  {
    name: 'list_prospects',
    description: 'Liste les prospects CRM de l\'utilisateur avec leur stage (new, contacted, replied, meeting, won, lost).',
    inputSchema: {
      type: 'object',
      properties: {
        stage: { type: 'string', description: 'Filtrer par stage: new | contacted | replied | meeting | won | lost' },
        limit: { type: 'number', description: 'Nombre max (défaut: 20, max: 100)' },
      },
    },
    handler: async (userId, args) => {
      const limit = Math.min(args.limit || 20, 100)
      const where: any = { userId }
      if (args.stage) where.stage = args.stage
      const prospects = await db.prospect.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, name: true, title: true, company: true, email: true, stage: true, tags: true, notes: true, createdAt: true },
      })
      return jsonResult({ count: prospects.length, prospects })
    },
  },
  {
    name: 'create_prospect',
    description: 'Ajoute un nouveau prospect au CRM.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nom du prospect' },
        email: { type: 'string', description: 'Email' },
        company: { type: 'string', description: 'Entreprise' },
        title: { type: 'string', description: 'Titre/poste' },
        linkedinUrl: { type: 'string', description: 'URL du profil LinkedIn' },
        notes: { type: 'string', description: 'Notes libres' },
      },
      required: ['name'],
    },
    handler: async (userId, args) => {
      if (!args.name || args.name.trim().length < 1) {
        return textResult('Nom requis', true)
      }
      const prospect = await db.prospect.create({
        data: {
          userId,
          name: args.name.trim(),
          email: args.email || null,
          company: args.company || null,
          title: args.title || null,
          linkedinUrl: args.linkedinUrl || null,
          notes: args.notes || null,
          stage: 'new',
        },
      })
      return jsonResult({ success: true, id: prospect.id, stage: prospect.stage })
    },
  },

  // ─── Analytics ───
  {
    name: 'get_analytics',
    description: 'Récupère les KPIs de performance LinkedIn (vues, likes, comments, shares sur 14/30/90 jours).',
    inputSchema: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'Période: 14d | 30d | 90d (défaut: 30d)' },
      },
    },
    handler: async (userId, args) => {
      const period = args.period || '30d'
      const days = period === '14d' ? 14 : period === '90d' ? 90 : 30
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const startDateStr = startDate.toISOString().split('T')[0]

      const [metrics, posts] = await Promise.all([
        db.engagementMetric.findMany({ where: { userId, date: { gte: startDateStr } } }),
        db.postProposal.count({ where: { userId, status: 'published', publishedAt: { gte: startDate } } }),
      ])

      const totals = {
        views: metrics.reduce((s, m) => s + m.views, 0),
        likes: metrics.reduce((s, m) => s + m.likes, 0),
        comments: metrics.reduce((s, m) => s + m.comments, 0),
        shares: metrics.reduce((s, m) => s + m.shares, 0),
        clicks: metrics.reduce((s, m) => s + m.clicks, 0),
      }
      const engagementRate = totals.views > 0
        ? ((totals.likes + totals.comments + totals.shares) / totals.views * 100).toFixed(2)
        : '0'

      return jsonResult({ period, postsPublished: posts, ...totals, engagementRate: `${engagementRate}%` })
    },
  },

  // ─── Clients (agence) ───
  {
    name: 'list_clients',
    description: "Liste les clients de l'agence avec leur performance (nombre de posts, objectif mensuel).",
    inputSchema: {
      type: 'object',
      properties: {
        active: { type: 'boolean', description: 'Filtrer clients actifs uniquement' },
      },
    },
    handler: async (userId, args) => {
      const where: any = { userId }
      if (args.active === true) where.active = true
      const clients = await db.client.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, name: true, active: true, monthlyGoal: true,
          _count: { select: { posts: true } },
        },
      })
      return jsonResult({ count: clients.length, clients })
    },
  },

  // ─── Agent Memory ───
  {
    name: 'get_memory',
    description: 'Récupère la mémoire à long terme de l\'agent IA (préférences, objectifs, faits stockés).',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filtrer par catégorie: general | preference | fact | goal' },
      },
    },
    handler: async (userId, args) => {
      const where: any = { userId }
      if (args.category) where.category = args.category
      const memory = await db.agentMemory.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        select: { key: true, value: true, category: true, updatedAt: true },
      })
      return jsonResult({ count: memory.length, memory })
    },
  },
  {
    name: 'set_memory',
    description: 'Stocke ou met à jour une entrée de mémoire à long terme pour l\'agent IA.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Clé unique (ex: ton_prefere, audience_cible)' },
        value: { type: 'string', description: 'Valeur à stocker' },
        category: { type: 'string', description: 'Catégorie: general | preference | fact | goal (défaut: general)' },
      },
      required: ['key', 'value'],
    },
    handler: async (userId, args) => {
      const validCategories = ['general', 'preference', 'fact', 'goal']
      const category = validCategories.includes(args.category) ? args.category : 'general'
      const entry = await db.agentMemory.upsert({
        where: { userId_key: { userId, key: args.key.trim() } },
        update: { value: args.value, category },
        create: { userId, key: args.key.trim(), value: args.value, category },
      })
      return jsonResult({ success: true, key: entry.key, category: entry.category })
    },
  },
]

// ============================================================
// Helper : trouver un tool par son nom
// ============================================================
export function findTool(name: string): McpTool | undefined {
  return MCP_TOOLS.find(t => t.name === name)
}

// ============================================================
// Helper : format tools pour MCP tools/list response
// ============================================================
export function toolsToList(): any[] {
  return MCP_TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }))
}
