import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// ============================================================
// Prospect Scoring — Scoring rule-based des prospects CRM
//
// Calcule un score 0-100 basé sur:
//   - Stage progression (new=5, contacted=20, replied=50, meeting=75, won=100, lost=0)
//   - Message reply rate (bonus si réponses reçues)
//   - Tags (bonus si tags spécifiques: vip, hot, priority)
//   - Recency (malus si pas d'activité depuis >30j)
//   - LinkedIn URL (bonus si profil LinkedIn renseigné)
//   - Email (bonus si email renseigné)
//
// Le score est stocké sur Prospect.score + scoredAt
// ============================================================

const STAGE_SCORES: Record<string, number> = {
  new: 5,
  contacted: 20,
  replied: 50,
  meeting: 75,
  won: 100,
  lost: 0,
}

const PRIORITY_TAGS = ['vip', 'hot', 'priority', 'urgent', 'key']

export interface ProspectScoreInput {
  stage: string
  tags: string | null
  linkedinUrl: string | null
  email: string | null
  messagesCount: number
  repliesCount: number
  lastActivityAt: Date | null
}

export interface ProspectScoreResult {
  score: number
  breakdown: {
    stage: number
    replyRate: number
    tags: number
    recency: number
    completeness: number
  }
}

// ============================================================
// Calculate score for a single prospect (pure function)
// ============================================================
export function calculateProspectScore(input: ProspectScoreInput): ProspectScoreResult {
  const now = new Date()
  let score = 0

  // 1. Stage score (base, 0-50 points)
  const stageScore = STAGE_SCORES[input.stage] ?? 5
  score += Math.min(stageScore * 0.5, 50) // max 50 from stage

  // 2. Reply rate bonus (0-20 points)
  let replyRateBonus = 0
  if (input.messagesCount > 0) {
    const replyRate = input.repliesCount / input.messagesCount
    replyRateBonus = Math.round(replyRate * 20)
    score += replyRateBonus
  }

  // 3. Priority tags bonus (0-15 points)
  let tagsBonus = 0
  if (input.tags) {
    const tagList = input.tags.toLowerCase().split(',').map(t => t.trim())
    const hasPriorityTag = tagList.some(t => PRIORITY_TAGS.some(pt => t.includes(pt)))
    if (hasPriorityTag) tagsBonus = 15
    else if (tagList.length > 0) tagsBonus = 5 // any tags = small bonus
    score += tagsBonus
  }

  // 4. Recency malus (0 to -15 points)
  let recencyMalus = 0
  if (input.lastActivityAt) {
    const daysSinceActivity = Math.floor((now.getTime() - input.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceActivity > 90) recencyMalus = -15
    else if (daysSinceActivity > 60) recencyMalus = -10
    else if (daysSinceActivity > 30) recencyMalus = -5
  } else {
    recencyMalus = -5 // no activity at all
  }
  score += recencyMalus

  // 5. Data completeness bonus (0-15 points)
  let completenessBonus = 0
  if (input.linkedinUrl) completenessBonus += 8
  if (input.email) completenessBonus += 7
  score += completenessBonus

  // Clamp 0-100
  score = Math.max(0, Math.min(100, Math.round(score)))

  return {
    score,
    breakdown: {
      stage: Math.min(stageScore * 0.5, 50),
      replyRate: replyRateBonus,
      tags: tagsBonus,
      recency: recencyMalus,
      completeness: completenessBonus,
    },
  }
}

// ============================================================
// Score a single prospect in DB
// ============================================================
export async function scoreProspect(prospectId: string): Promise<number> {
  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    select: {
      id: true, stage: true, tags: true, linkedinUrl: true, email: true,
      messages: {
        select: { id: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!prospect) throw new Error('Prospect introuvable')

  const messagesCount = prospect.messages.length
  const repliesCount = prospect.messages.filter(m => m.status === 'replied').length
  const lastActivityAt = prospect.messages.length > 0
    ? prospect.messages[0].createdAt
    : null

  const result = calculateProspectScore({
    stage: prospect.stage,
    tags: prospect.tags,
    linkedinUrl: prospect.linkedinUrl,
    email: prospect.email,
    messagesCount,
    repliesCount,
    lastActivityAt,
  })

  await db.prospect.update({
    where: { id: prospectId },
    data: {
      score: result.score,
      scoredAt: new Date(),
    },
  })

  return result.score
}

// ============================================================
// Score all prospects for a user (batch)
// ============================================================
export async function scoreAllProspectsForUser(userId: string): Promise<{
  scored: number
  errors: number
}> {
  const prospects = await db.prospect.findMany({
    where: { userId },
    select: { id: true },
  })

  let scored = 0
  let errors = 0

  for (const prospect of prospects) {
    try {
      await scoreProspect(prospect.id)
      scored++
    } catch (err: any) {
      errors++
      logger.warn({ prospectId: prospect.id, err: err.message }, 'Failed to score prospect')
    }
  }

  logger.info({ userId, scored, errors }, 'Prospect scoring batch completed')
  return { scored, errors }
}
