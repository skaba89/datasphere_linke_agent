import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { generateChat } from '@/lib/ai-providers'
import { generateLinkedInPosts } from '@/lib/ai'
import { createNotification } from '@/lib/notifications'
import { checkPlanLimit } from '@/lib/plans'
import { processPendingComments, processCrmSequences } from '@/lib/automation'
import type { HermesConfig, AgentRun } from '@prisma/client'

// ============================================================
// HERMES — Agent d'automatisation autonome
//
// Hermes est un agent qui s'exécute périodiquement (via cron)
// et orchestre un workflow configurable :
//
//   1. pending_tasks    — traite les AgentTask en attente
//   2. generate_posts   — génère des posts LinkedIn depuis les tâches
//   3. analyze_prospects— avance les séquences CRM + relances
//   4. token_check      — vérifie l'expiration des tokens LinkedIn
//   5. quality_analysis — analyse les brouillons avec Content Quality
//   6. summarize        — génère un résumé LLM et notifie l'utilisateur
//
// Chaque étape est isolée (try/catch), les échecs n'abortent pas le run.
// Le statut du run est 'success' | 'partial' | 'failed'.
// ============================================================

export type HermesTrigger = 'cron' | 'manual' | 'api'

export interface HermesRunResult {
  runId: string
  status: 'success' | 'partial' | 'failed'
  durationMs: number
  stepsTotal: number
  stepsSuccess: number
  stepsFailed: number
  totals: Record<string, number>
  summary?: string
  error?: string
}

interface StepResult {
  step: string
  status: 'success' | 'failed' | 'skipped'
  durationMs: number
  output?: any
  error?: string
}

// ─── Default workflow steps ───
export const DEFAULT_WORKFLOW_STEPS = [
  'pending_tasks',
  'generate_posts',
  'analyze_prospects',
  'token_check',
  'quality_analysis',
  'summarize',
] as const

export const ALL_WORKFLOW_STEPS = [
  'pending_tasks',
  'generate_posts',
  'analyze_prospects',
  'token_check',
  'quality_analysis',
  'summarize',
] as const

// ============================================================
// Get or create HermesConfig for a user
// ============================================================
export async function getOrCreateHermesConfig(userId: string): Promise<HermesConfig> {
  let config = await db.hermesConfig.findUnique({ where: { userId } })
  if (!config) {
    config = await db.hermesConfig.create({
      data: {
        userId,
        enabled: false,
        workflowSteps: [...DEFAULT_WORKFLOW_STEPS],
      },
    })
  }
  return config
}

// ============================================================
// Main orchestrator: run Hermes for a single user
// ============================================================
export async function runHermesForUser(
  userId: string,
  trigger: HermesTrigger = 'cron'
): Promise<HermesRunResult> {
  const startTime = Date.now()

  // 1. Load config
  const config = await getOrCreateHermesConfig(userId)
  const workflowSteps = (config.workflowSteps as string[]) || [...DEFAULT_WORKFLOW_STEPS]

  // 2. Check for already-running Hermes for this user (anti-overlap)
  const existingRun = await db.agentRun.findFirst({
    where: { userId, status: 'running' },
    select: { id: true },
  })
  if (existingRun) {
    logger.warn({ userId, existingRunId: existingRun.id }, 'Hermes already running for user, skipping')
    return {
      runId: existingRun.id,
      status: 'failed',
      durationMs: 0,
      stepsTotal: 0,
      stepsSuccess: 0,
      stepsFailed: 0,
      totals: {},
      error: 'Hermes already running for this user',
    }
  }

  // 3. Create AgentRun record
  const run = await db.agentRun.create({
    data: {
      userId,
      trigger,
      status: 'running',
      startedAt: new Date(),
      stepsJson: [],
    },
  })

  logger.info({ userId, runId: run.id, trigger, steps: workflowSteps }, 'Hermes run started')

  const stepResults: StepResult[] = []
  const totals: Record<string, number> = {}

  // 4. Execute each step
  for (const stepId of workflowSteps) {
    const stepStart = Date.now()
    try {
      const result = await executeStep(stepId, userId, config)
      const durationMs = Date.now() - stepStart
      stepResults.push({
        step: stepId,
        status: 'success',
        durationMs,
        output: result,
      })
      // Merge totals
      if (result && typeof result === 'object') {
        for (const [k, v] of Object.entries(result)) {
          if (typeof v === 'number') totals[k] = (totals[k] || 0) + v
        }
      }
    } catch (err: any) {
      const durationMs = Date.now() - stepStart
      stepResults.push({
        step: stepId,
        status: 'failed',
        durationMs,
        error: err.message,
      })
      logger.error({ userId, runId: run.id, step: stepId, err: err.message }, 'Hermes step failed')
    }
  }

  // 5. Determine overall status
  const stepsSuccess = stepResults.filter(s => s.status === 'success').length
  const stepsFailed = stepResults.filter(s => s.status === 'failed').length
  let status: 'success' | 'partial' | 'failed' = 'success'
  if (stepsFailed === stepResults.length) status = 'failed'
  else if (stepsFailed > 0) status = 'partial'

  // 6. Generate summary (if 'summarize' step is in workflow)
  let summary: string | undefined
  if (workflowSteps.includes('summarize') && stepsSuccess > 0) {
    try {
      summary = await generateRunSummary(userId, stepResults, totals)
    } catch (err: any) {
      logger.warn({ userId, runId: run.id, err: err.message }, 'Failed to generate Hermes summary')
    }
  }

  // 7. Update AgentRun
  const durationMs = Date.now() - startTime
  await db.agentRun.update({
    where: { id: run.id },
    data: {
      status,
      finishedAt: new Date(),
      durationMs,
      stepsTotal: stepResults.length,
      stepsSuccess,
      stepsFailed,
      stepsJson: stepResults as any,
      summary,
      totalsJson: totals as any,
    },
  })

  // 8. Update HermesConfig lastRun
  await db.hermesConfig.update({
    where: { userId },
    data: {
      lastRunAt: new Date(),
      lastRunStatus: status,
    },
  })

  // 9. Notify user
  if (status === 'failed' && config.notifyOnError) {
    await createNotification({
      userId,
      type: 'ai',
      title: 'Hermes — Échec du run',
      message: `Le run Hermes a échoué (${stepsFailed}/${stepResults.length} étapes en erreur). Voir les détails dans l'onglet Hermes.`,
      link: '/?tab=hermes',
    })
  } else if (status !== 'failed' && config.notifyOnDone) {
    await createNotification({
      userId,
      type: 'ai',
      title: 'Hermes — Run terminé',
      message: summary || `Hermes a terminé son run (${stepsSuccess}/${stepResults.length} étapes réussies).`,
      link: '/?tab=hermes',
    })
  }

  logger.info({
    userId, runId: run.id, status, durationMs, stepsSuccess, stepsFailed,
  }, 'Hermes run completed')

  return {
    runId: run.id,
    status,
    durationMs,
    stepsTotal: stepResults.length,
    stepsSuccess,
    stepsFailed,
    totals,
    summary,
  }
}

// ============================================================
// Execute a single workflow step
// ============================================================
async function executeStep(stepId: string, userId: string, config: HermesConfig): Promise<any> {
  switch (stepId) {
    case 'pending_tasks':
      return stepPendingTasks(userId, config)
    case 'generate_posts':
      return stepGeneratePosts(userId, config)
    case 'analyze_prospects':
      return stepAnalyzeProspects(userId)
    case 'token_check':
      return stepTokenCheck(userId)
    case 'quality_analysis':
      return stepQualityAnalysis(userId, config)
    case 'summarize':
      return stepSummarize(userId)
    default:
      logger.warn({ stepId }, 'Unknown Hermes step, skipping')
      return { skipped: true }
  }
}

// ============================================================
// Step 1: pending_tasks — Process AgentTask items with status='todo'
// ============================================================
async function stepPendingTasks(userId: string, config: HermesConfig): Promise<any> {
  const maxTasks = config.maxTasksPerRun
  const tasks = await db.agentTask.findMany({
    where: { userId, status: 'todo' },
    orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
    take: maxTasks,
  })

  let processed = 0
  let completed = 0
  let blocked = 0

  for (const task of tasks) {
    try {
      // Mark as in_progress
      await db.agentTask.update({
        where: { id: task.id },
        data: { status: 'in_progress' },
      })

      // Execute based on task type
      const result = await executeTaskByType(task, userId)
      processed++

      if (result.blocked) {
        await db.agentTask.update({
          where: { id: task.id },
          data: { status: 'blocked', output: JSON.stringify(result), agentNotes: result.note || null },
        })
        blocked++
      } else {
        await db.agentTask.update({
          where: { id: task.id },
          data: {
            status: 'done',
            output: JSON.stringify(result),
            completedAt: new Date(),
          },
        })
        completed++
      }
    } catch (err: any) {
      // Reset to todo so it can be retried next run
      await db.agentTask.update({
        where: { id: task.id },
        data: { status: 'todo', agentNotes: `Erreur: ${err.message}` },
      }).catch(() => {})
    }
  }

  return { tasksProcessed: processed, tasksCompleted: completed, tasksBlocked: blocked }
}

// ============================================================
// Execute a single AgentTask by type
// ============================================================
async function executeTaskByType(task: any, userId: string): Promise<any> {
  const input = task.input ? JSON.parse(task.input) : {}
  switch (task.type) {
    case 'generate_post': {
      // Will be handled by stepGeneratePosts
      return { blocked: true, note: 'Handled by generate_posts step' }
    }
    case 'analyze_profile': {
      const result = await generateChat({
        system: 'Tu es un expert LinkedIn. Analyse le profil et donne des recommandations actionnables.',
        user: `Analyse ce profil LinkedIn: ${input.profileText || input.url || 'N/A'}`,
        temperature: 0.6,
        maxTokens: 800,
      })
      return { analysis: result.content, provider: result.provider }
    }
    case 'reach_out':
    case 'follow_up': {
      // These are handled by stepAnalyzeProspects (CRM sequences)
      return { blocked: true, note: 'Handled by analyze_prospects step' }
    }
    case 'custom':
    default: {
      // Custom task — just mark as done with a note
      return { note: 'Custom task acknowledged' }
    }
  }
}

// ============================================================
// Step 2: generate_posts — Generate LinkedIn posts from tasks
// ============================================================
async function stepGeneratePosts(userId: string, config: HermesConfig): Promise<any> {
  // Find generate_post tasks
  const genTasks = await db.agentTask.findMany({
    where: { userId, status: 'todo', type: 'generate_post' },
    take: config.maxTasksPerRun,
  })

  if (genTasks.length === 0) {
    // ⭐ Fallback: auto-generate from user's SmartPosterSettings if configured
    const settings = await db.smartPosterSettings.findUnique({ where: { userId } })
    if (!settings || !settings.topics) {
      return { postsGenerated: 0, skipped: 'no_topics_configured' }
    }

    // Check plan limit
    const planCheck = await checkPlanLimit(userId, 'postsPerDay')
    if (!planCheck.allowed) {
      return { postsGenerated: 0, skipped: 'plan_limit_reached' }
    }

    try {
      const posts = await generateLinkedInPosts({
        topics: settings.topics,
        tone: settings.tone || 'professionnel',
        targetAudience: settings.targetAudience || '',
        language: 'fr',
        count: 1,
      })

      let postsGenerated = 0
      for (const post of posts) {
        await db.postProposal.create({
          data: {
            userId,
            title: post.title || `Post sur ${settings.topics.slice(0, 50)}`,
            content: post.content,
            hashtags: post.hashtags || '',
            format: post.format || 'text',
            angle: 'hermes-auto',
            targetAudience: settings.targetAudience || '',
            qualityScore: 5.0,
            optimalTime: 'manual',
            engagementEst: 'pending',
            status: 'pending',
          },
        })
        postsGenerated++
      }
      return { postsGenerated, source: 'auto' }
    } catch (err: any) {
      logger.warn({ userId, err: err.message }, 'Hermes auto-generate failed')
      return { postsGenerated: 0, error: err.message }
    }
  }

  // Check plan limit
  const planCheck = await checkPlanLimit(userId, 'postsPerDay')
  if (!planCheck.allowed) {
    return { postsGenerated: 0, skipped: 'plan_limit_reached' }
  }

  let postsGenerated = 0
  for (const task of genTasks) {
    try {
      const input = task.input ? JSON.parse(task.input) : {}
      const topics = input.topics || task.title
      const tone = input.tone || 'professionnel'
      const audience = input.audience || ''

      const posts = await generateLinkedInPosts({
        topics: Array.isArray(topics) ? topics.join(', ') : topics,
        tone,
        targetAudience: audience,
        language: 'fr',
        count: input.count || 1,
      })

      for (const post of posts) {
        await db.postProposal.create({
          data: {
            userId,
            title: post.title || `Post sur ${topics[0]}`,
            content: post.content,
            hashtags: post.hashtags || '',
            format: post.format || 'text',
            angle: 'hermes',
            targetAudience: audience,
            qualityScore: 5.0,
            optimalTime: 'manual',
            engagementEst: 'pending',
            status: 'pending', // always pending, user must approve
          },
        })
        postsGenerated++
      }

      // Mark task as done
      await db.agentTask.update({
        where: { id: task.id },
        data: {
          status: 'done',
          output: JSON.stringify({ postsGenerated: posts.length }),
          completedAt: new Date(),
        },
      })
    } catch (err: any) {
      // Leave task as todo for retry
      logger.warn({ taskId: task.id, err: err.message }, 'Failed to generate post from task')
    }
  }

  return { postsGenerated }
}

// ============================================================
// Step 3: analyze_prospects — Run CRM sequences + comment replies
// ============================================================
async function stepAnalyzeProspects(userId: string): Promise<any> {
  const [commentsResult, sequencesResult] = await Promise.all([
    processPendingComments(userId),
    processCrmSequences(userId),
  ])

  return {
    commentsProcessed: commentsResult.processed,
    commentsGenerated: commentsResult.generated,
    sequencesSent: sequencesResult.sent,
    sequencesFailed: sequencesResult.failed,
  }
}

// ============================================================
// Step 4: token_check — Check LinkedIn token expiration
// ============================================================
async function stepTokenCheck(userId: string): Promise<any> {
  const now = new Date()
  const warningThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const urgentThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const accounts = await db.linkedInAccount.findMany({
    where: { userId, status: { in: ['active', 'disabled', 'expired'] } },
    select: { id: true, displayName: true, tokenExpiresAt: true, status: true },
  })

  let expired = 0
  let warning = 0
  let urgent = 0

  for (const account of accounts) {
    if (!account.tokenExpiresAt) continue
    const exp = account.tokenExpiresAt
    if (exp < now) {
      expired++
      if (account.status !== 'expired') {
        await db.linkedInAccount.update({
          where: { id: account.id },
          data: { status: 'expired' },
        }).catch(() => {})
      }
    } else if (exp < urgentThreshold) {
      urgent++
    } else if (exp < warningThreshold) {
      warning++
    }
  }

  return { expired, warning, urgent, totalAccounts: accounts.length }
}

// ============================================================
// Step 5: quality_analysis — Analyze recent pending drafts
// ============================================================
async function stepQualityAnalysis(userId: string, config: HermesConfig): Promise<any> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000) // last 24h
  const drafts = await db.postProposal.findMany({
    where: {
      userId,
      status: 'pending',
      createdAt: { gte: since },
    },
    take: 10,
    select: { id: true, content: true, qualityScore: true },
  })

  let analyzed = 0
  let autoRejected = 0

  for (const draft of drafts) {
    try {
      const result = await generateChat({
        system: `Tu es un expert en optimisation de contenu LinkedIn. Analyse ce post et donne un score de qualité.

Réponds UNIQUEMENT en JSON valide :
{
  "score": { "overall": 0-10 },
  "suggestions": ["suggestion1", "suggestion2"]
}`,
        user: `Analyse ce post:\n\n${draft.content.slice(0, 1500)}`,
        temperature: 0.3,
        maxTokens: 500,
      })

      let score = draft.qualityScore
      try {
        const jsonMatch = result.content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.score?.overall !== undefined) {
            score = Number(parsed.score.overall)
          }
        }
      } catch {}

      await db.postProposal.update({
        where: { id: draft.id },
        data: { qualityScore: score },
      })

      // Auto-reject very low quality
      if (score < 3) {
        await db.postProposal.update({
          where: { id: draft.id },
          data: { status: 'rejected' },
        })
        autoRejected++
      }
      analyzed++
    } catch (err: any) {
      logger.warn({ draftId: draft.id, err: err.message }, 'Quality analysis failed for draft')
    }
  }

  return { draftsAnalyzed: analyzed, draftsAutoRejected: autoRejected }
}

// ============================================================
// Step 6: summarize — Generate a human-readable summary
// ============================================================
async function stepSummarize(userId: string): Promise<any> {
  // This step's output is used by the orchestrator to generate the summary
  return { message: 'Summary step completed' }
}

// ============================================================
// Generate a human-readable summary of the run using LLM
// ============================================================
async function generateRunSummary(
  userId: string,
  stepResults: StepResult[],
  totals: Record<string, number>
): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true },
  })

  const stepSummary = stepResults.map(s =>
    `- ${s.step}: ${s.status} (${s.durationMs}ms)${s.error ? ` — erreur: ${s.error}` : ''}`
  ).join('\n')

  const totalsStr = Object.entries(totals)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')

  try {
    const result = await generateChat({
      system: `Tu es Hermes, l'agent d'automatisation de DataSphere. Résume en français (2-3 phrases max) le run que tu viens d'exécuter. Sois concret et positif.`,
      user: `Bonjour ${user?.name || 'utilisateur'},

Voici mon run d'aujourd'hui:

Étapes:
${stepSummary}

Totaux: ${totalsStr}

Résume ce que j'ai accompli en 2-3 phrases.`,
      temperature: 0.5,
      maxTokens: 200,
    })
    return result.content
  } catch {
    return `Run terminé: ${totalsStr || 'aucune action'}`
  }
}

// ============================================================
// Get Hermes run history for a user
// ============================================================
export async function getHermesRuns(userId: string, limit = 20): Promise<AgentRun[]> {
  return db.agentRun.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
  })
}

// ============================================================
// Update Hermes config
// ============================================================
export async function updateHermesConfig(
  userId: string,
  updates: {
    enabled?: boolean
    scheduleCron?: string
    maxTasksPerRun?: number
    workflowSteps?: string[]
    notifyOnDone?: boolean
    notifyOnError?: boolean
  }
): Promise<HermesConfig> {
  const config = await getOrCreateHermesConfig(userId)
  const data: any = {}
  if (updates.enabled !== undefined) data.enabled = updates.enabled
  if (updates.scheduleCron !== undefined) data.scheduleCron = updates.scheduleCron
  if (updates.maxTasksPerRun !== undefined) data.maxTasksPerRun = Math.min(Math.max(updates.maxTasksPerRun, 1), 20)
  if (updates.workflowSteps !== undefined) {
    // Validate steps
    const validSteps = updates.workflowSteps.filter(s => ALL_WORKFLOW_STEPS.includes(s as any))
    data.workflowSteps = validSteps.length > 0 ? validSteps : [...DEFAULT_WORKFLOW_STEPS]
  }
  if (updates.notifyOnDone !== undefined) data.notifyOnDone = updates.notifyOnDone
  if (updates.notifyOnError !== undefined) data.notifyOnError = updates.notifyOnError

  return db.hermesConfig.update({
    where: { userId },
    data,
  })
}
