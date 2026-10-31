// ============================================================
// Templates de posts LinkedIn par industrie
//
// Bibliothèque de prompts pré-configurés que l'utilisateur peut
// utiliser pour générer du contenu adapté à son secteur.
// ============================================================

export interface PostTemplate {
  id: string
  industry: string
  name: string
  description: string
  topics: string
  tone: string
  targetAudience: string
  angle: string
  exampleTitle: string
}

export const POST_TEMPLATES: PostTemplate[] = [
  // ─── Tech & SaaS ───
  {
    id: 'tech-startup-story',
    industry: 'Tech & SaaS',
    name: 'Storytelling startup',
    description: 'Racontez le parcours de votre startup avec authenticité',
    topics: 'startup, fundraising, product, growth, tech',
    tone: 'Authentique et inspirant',
    targetAudience: 'founders, investisseurs, tech enthusiasts',
    angle: 'storytelling',
    exampleTitle: 'Comment on a passé de 0 à 10K utilisateurs en 6 mois',
  },
  {
    id: 'tech-tutorial',
    industry: 'Tech & SaaS',
    name: 'Tutoriel technique',
    description: 'Partagez un tutoriel concret et actionnable',
    topics: 'dev, code, architecture, best practices, outils',
    tone: 'Pédagogique et précis',
    targetAudience: 'développeurs, CTO, tech leads',
    angle: 'éducatif',
    exampleTitle: '5 patterns React que tout senior devrait connaître',
  },
  {
    id: 'tech-product-launch',
    industry: 'Tech & SaaS',
    name: 'Lancement produit',
    description: 'Annnoncez un nouveau produit ou feature avec impact',
    topics: 'product, launch, innovation, features',
    tone: 'Enthousiaste mais pro',
    targetAudience: 'utilisateurs, prospects, communauté tech',
    angle: 'annonce',
    exampleTitle: 'On lance aujourd\'hui notre nouvelle feature IA',
  },

  // ─── Marketing & Growth ───
  {
    id: 'marketing-case-study',
    industry: 'Marketing & Growth',
    name: 'Étude de cas client',
    description: 'Décrivez un succès client avec chiffres concrets',
    topics: 'marketing, SEO, growth, conversion, ROI',
    tone: 'Factuel et convaincant',
    targetAudience: 'marketers, CMO, founders',
    angle: 'data',
    exampleTitle: 'Comment nous avons doublé le trafic de notre client en 90 jours',
  },
  {
    id: 'marketing-trends',
    industry: 'Marketing & Growth',
    name: 'Tendances du moment',
    description: 'Analysez une tendance marketing émergente',
    topics: 'marketing, trends, 2026, stratégie, content',
    tone: 'Analytique et prospectif',
    targetAudience: 'marketers, brand managers, entrepreneurs',
    angle: 'expert',
    exampleTitle: '3 tendances marketing qui vont exploser en 2026',
  },

  // ─── Coaching & RH ───
  {
    id: 'coaching-personal-story',
    industry: 'Coaching & RH',
    name: 'Story personnelle',
    description: 'Partagez une expérience personnelle transformatrice',
    topics: 'leadership, développement personnel, carrière, mindset',
    tone: 'Vulnérable et inspirant',
    targetAudience: 'professionnels en transition, managers',
    angle: 'humain',
    exampleTitle: 'Le jour où j\'ai tout quitté pour devenir coach',
  },
  {
    id: 'coaching-advice',
    industry: 'Coaching & RH',
    name: 'Conseil leadership',
    description: 'Donnez un conseil leadership actionnable',
    topics: 'leadership, management, équipe, feedback, performance',
    tone: 'Direct et bienveillant',
    targetAudience: 'managers, leaders, RH',
    angle: 'éducatif',
    exampleTitle: 'Les 3 phrases qui transforment vos 1:1',
  },

  // ─── Finance & Conseil ───
  {
    id: 'finance-analysis',
    industry: 'Finance & Conseil',
    name: 'Analyse marché',
    description: 'Analysez une tendance économique ou financière',
    topics: 'finance, économie, investissement, marché, analysis',
    tone: 'Rigoureux et nuancé',
    targetAudience: 'investisseurs, CFO, analysts',
    angle: 'expert',
    exampleTitle: 'Ce que les taux 2026 signifient pour votre levée',
  },

  // ─── E-commerce & Retail ───
  {
    id: 'ecommerce-product-story',
    industry: 'E-commerce & Retail',
    name: 'Histoire produit',
    description: 'Racontez l\'histoire derrière un produit',
    topics: 'produit, sourcing, fabrication, qualité, savoir-faire',
    tone: 'Chaleureux et authentique',
    targetAudience: 'consommateurs, acheteurs, fans de la marque',
    angle: 'storytelling',
    exampleTitle: 'Pourquoi nos produits sont fabriqués en France',
  },

  // ─── Santé & Bien-être ───
  {
    id: 'health-tips',
    industry: 'Santé & Bien-être',
    name: 'Conseil bien-être',
    description: 'Partagez un conseil santé pratique',
    topics: 'santé, nutrition, sport, sommeil, bien-être',
    tone: 'Bienveillant et scientifique',
    targetAudience: 'professionnels stressés, sportifs, parents',
    angle: 'éducatif',
    exampleTitle: 'Pourquoi le sommeil est votre meilleur investissement',
  },

  // ─── Real Estate ───
  {
    id: 'realestate-market-insight',
    industry: 'Immobilier',
    name: 'Insight marché',
    description: 'Analysez une tendance du marché immobilier',
    topics: 'immobilier, marché, investissement, prix, zones',
    tone: 'Expert et factuel',
    targetAudience: 'investisseurs, acheteurs, agents immobiliers',
    angle: 'expert',
    exampleTitle: 'Les 5 villes où investir en 2026',
  },

  // ─── Legal & Compliance ───
  {
    id: 'legal-explainer',
    industry: 'Juridique & Compliance',
    name: 'Explication loi',
    description: 'Décryptez une loi ou réglementation simplement',
    topics: 'droit, réglementation, RGPD, contrats, société',
    tone: 'Clair et accessible',
    targetAudience: 'entrepreneurs, PME, fondateurs',
    angle: 'éducatif',
    exampleTitle: 'RGPD : 5 erreurs qui coûtent cher en 2026',
  },
]

// ============================================================
// Helper : récupérer les templates par industrie
// ============================================================
export function getTemplatesByIndustry(industry: string): PostTemplate[] {
  return POST_TEMPLATES.filter((t) => t.industry === industry)
}

export function getIndustries(): string[] {
  return [...new Set(POST_TEMPLATES.map((t) => t.industry))]
}
