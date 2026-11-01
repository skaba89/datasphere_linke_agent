'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Bot, Play, Loader2, CheckCircle2, AlertCircle, Clock,
  Zap, Settings, Activity, ChevronDown, ChevronRight, Sparkles
} from 'lucide-react'

// ============================================================
// HERMES TAB — Agent d'automatisation autonome
// ============================================================

interface HermesConfig {
  id: string
  userId: string
  enabled: boolean
  scheduleCron: string
  maxTasksPerRun: number
  workflowSteps: string[]
  notifyOnDone: boolean
  notifyOnError: boolean
  lastRunAt: string | null
  lastRunStatus: string | null
}

interface AgentRun {
  id: string
  trigger: string
  status: string
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  stepsTotal: number
  stepsSuccess: number
  stepsFailed: number
  stepsJson: any
  summary: string | null
  totalsJson: any
  error: string | null
}

const STEP_LABELS: Record<string, string> = {
  pending_tasks: 'Tâches en attente',
  generate_posts: 'Génération de posts',
  analyze_prospects: 'Analyse prospects CRM',
  token_check: 'Vérification tokens LinkedIn',
  quality_analysis: 'Analyse qualité brouillons',
  summarize: 'Résumé du run',
}

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  running: { label: 'En cours', color: 'text-blue-600 bg-blue-50', icon: Loader2 },
  success: { label: 'Succès', color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 },
  partial: { label: 'Partiel', color: 'text-amber-600 bg-amber-50', icon: AlertCircle },
  failed: { label: 'Échec', color: 'text-red-600 bg-red-50', icon: AlertCircle },
}

export function HermesTab() {
  const [config, setConfig] = useState<HermesConfig | null>(null)
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)

  const load = async () => {
    try {
      const [configRes, runsRes] = await Promise.all([
        fetch('/api/hermes/config'),
        fetch('/api/hermes/runs?limit=10'),
      ])
      const configData = await configRes.json()
      const runsData = await runsRes.json()
      if (configData.success) setConfig(configData.data)
      if (runsData.success) setRuns(runsData.data)
    } catch (err: any) {
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRun = async () => {
    setRunning(true)
    try {
      const res = await fetch('/api/hermes/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'manual' }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success(`Hermes terminé: ${data.data.status} (${data.data.stepsSuccess}/${data.data.stepsTotal} étapes)`)
      load()
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`)
    } finally {
      setRunning(false)
    }
  }

  const handleToggleEnabled = async () => {
    if (!config) return
    setSaving(true)
    try {
      const res = await fetch('/api/hermes/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !config.enabled }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setConfig(data.data)
      toast.success(config.enabled ? 'Hermes désactivé' : 'Hermes activé')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveConfig = async (updates: Partial<HermesConfig>) => {
    setSaving(true)
    try {
      const res = await fetch('/api/hermes/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setConfig(data.data)
      toast.success('Configuration enregistrée')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleStep = (step: string) => {
    if (!config) return
    const steps = config.workflowSteps.includes(step)
      ? config.workflowSteps.filter(s => s !== step)
      : [...config.workflowSteps, step]
    handleSaveConfig({ workflowSteps: steps })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-purple-600" />
            Hermes — Agent IA
          </h1>
          <p className="text-slate-500 mt-1">
            Agent autonome qui automatise vos tâches LinkedIn : génération, CRM, qualité, suivi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRun}
            disabled={running}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {running ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Exécution...</>
            ) : (
              <><Play className="h-4 w-4 mr-2" />Lancer maintenant</>
            )}
          </Button>
        </div>
      </div>

      {/* Status card */}
      {config && (
        <Card className={config.enabled ? 'border-purple-200 bg-purple-50/30' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.enabled ? 'bg-purple-100' : 'bg-slate-100'}`}>
                  <Bot className={`h-5 w-5 ${config.enabled ? 'text-purple-600' : 'text-slate-400'}`} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    Hermes {config.enabled ? 'activé' : 'désactivé'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {config.lastRunAt
                      ? `Dernier run: ${new Date(config.lastRunAt).toLocaleString('fr-FR')} (${config.lastRunStatus})`
                      : 'Aucun run exécuté'}
                  </p>
                </div>
              </div>
              <Button
                variant={config.enabled ? 'destructive' : 'default'}
                size="sm"
                onClick={handleToggleEnabled}
                disabled={saving}
              >
                {config.enabled ? 'Désactiver' : 'Activer'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              Configuration
            </CardTitle>
            <CardDescription>Personnalisez le workflow d'Hermes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Max tasks per run */}
            <div>
              <Label className="text-xs">Tâches max par run</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={config?.maxTasksPerRun || 5}
                onChange={e => {
                  const n = parseInt(e.target.value)
                  if (n >= 1 && n <= 20) handleSaveConfig({ maxTasksPerRun: n })
                }}
                className="mt-1"
              />
              <p className="text-[10px] text-slate-400 mt-1">Entre 1 et 20</p>
            </div>

            <Separator />

            {/* Workflow steps */}
            <div>
              <Label className="text-xs mb-2 block">Étapes du workflow</Label>
              <div className="space-y-2">
                {Object.entries(STEP_LABELS).map(([step, label]) => (
                  <label key={step} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config?.workflowSteps.includes(step) || false}
                      onChange={() => toggleStep(step)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* Notifications */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config?.notifyOnDone || false}
                  onChange={e => handleSaveConfig({ notifyOnDone: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Notifier à la fin de chaque run</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config?.notifyOnError || false}
                  onChange={e => handleSaveConfig({ notifyOnError: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Notifier en cas d'erreur</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Recent runs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Runs récents
            </CardTitle>
            <CardDescription>{runs.length} run(s) dans l'historique</CardDescription>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Bot className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucun run exécuté</p>
                <p className="text-xs mt-1">Cliquez sur "Lancer maintenant" pour démarrer</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {runs.map(run => {
                  const statusMeta = STATUS_META[run.status] || STATUS_META.running
                  const StatusIcon = statusMeta.icon
                  const isExpanded = expandedRun === run.id
                  const steps = Array.isArray(run.stepsJson) ? run.stepsJson : []
                  return (
                    <div key={run.id} className="border border-slate-100 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        )}
                        <StatusIcon className={`h-4 w-4 flex-shrink-0 ${statusMeta.color.split(' ')[0]} ${run.status === 'running' ? 'animate-spin' : ''}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-900">
                              {new Date(run.startedAt).toLocaleString('fr-FR')}
                            </span>
                            <Badge variant="outline" className={`text-[9px] ${statusMeta.color}`}>
                              {statusMeta.label}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] text-slate-500">
                              {run.trigger}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {run.stepsSuccess}/{run.stepsTotal} étapes · {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '...'}
                          </p>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 p-3 bg-slate-50/50 space-y-2">
                          {/* Summary */}
                          {run.summary && (
                            <div className="p-2 bg-white rounded border border-slate-100">
                              <p className="text-xs font-semibold text-slate-700 mb-1">Résumé</p>
                              <p className="text-xs text-slate-600">{run.summary}</p>
                            </div>
                          )}

                          {/* Totals */}
                          {run.totalsJson && Object.keys(run.totalsJson).length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(run.totalsJson).map(([k, v]: [string, any]) => (
                                <Badge key={k} variant="outline" className="text-[10px] bg-white">
                                  {k}: {v}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Steps detail */}
                          <div className="space-y-1">
                            {steps.map((step: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                {step.status === 'success' ? (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                                )}
                                <span className="text-slate-700 flex-1">
                                  {STEP_LABELS[step.step] || step.step}
                                </span>
                                <span className="text-slate-400 text-[10px]">
                                  {step.durationMs ? `${(step.durationMs / 1000).toFixed(1)}s` : ''}
                                </span>
                                {step.error && (
                                  <span className="text-red-400 text-[10px] truncate max-w-[150px]" title={step.error}>
                                    {step.error}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Error */}
                          {run.error && (
                            <div className="p-2 bg-red-50 border border-red-100 rounded">
                              <p className="text-xs text-red-700">{run.error}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Comment fonctionne Hermes ?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate-600 space-y-2">
          <p><strong>Hermes</strong> est un agent IA qui s'exécute périodiquement (via cron) et orchestre un workflow configurable :</p>
          <ol className="space-y-1 ml-4 list-decimal">
            <li><strong>Tâches en attente</strong> — traite les AgentTask avec status='todo'</li>
            <li><strong>Génération de posts</strong> — crée des brouillons PostProposal depuis les tâches 'generate_post'</li>
            <li><strong>Analyse prospects</strong> — avance les séquences CRM et génère les relances</li>
            <li><strong>Vérification tokens</strong> — détecte les tokens LinkedIn expirants</li>
            <li><strong>Analyse qualité</strong> — score les brouillons et auto-rejette les mauvais</li>
            <li><strong>Résumé</strong> — génère un compte-rendu et notifie l'utilisateur</li>
          </ol>
          <p className="mt-2">Chaque étape est isolée : un échec n'interrompt pas le run. Les posts générés sont toujours <code>pending</code> — vous devez les approuver avant publication.</p>
        </CardContent>
      </Card>
    </div>
  )
}
