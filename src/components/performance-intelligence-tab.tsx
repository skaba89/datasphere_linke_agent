'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  TrendingUp, TrendingDown, Eye, ThumbsUp, MessageCircle, Share2,
  BarChart3, Clock, Calendar, Zap, Loader2, Sparkles, CheckCircle2,
  AlertCircle, Lightbulb, FileText, Activity, Award, Target
} from 'lucide-react'

// ============================================================
// LINKEDIN PERFORMANCE INTELLIGENCE TAB
// ============================================================

type Kpis = {
  posts: number
  likes: number
  comments: number
  shares: number
  views: number
  clicks: number
}

type PerformanceData = {
  kpis: { d14: Kpis; d30: Kpis; d90: Kpis }
  bestTime: {
    day: string | null
    hour: string | null
    dayDistribution: Record<string, number>
    hourDistribution: Record<string, number>
  }
  topPosts: Array<{
    id: string
    title: string
    preview: string
    publishedAt: string | null
    engagement: string
  }>
  contentVelocity: {
    postsPerWeek: number
    total90Days: number
    trend: 'up' | 'stable' | 'down'
  }
  statusDistribution: Record<string, number>
}

type AiRecommendation = {
  category?: string
  title?: string
  description?: string
  priority?: 'haute' | 'moyenne' | 'basse'
}

type AiResult = {
  score?: number
  summary?: string
  strengths?: string[]
  weaknesses?: string[]
  recommendations?: AiRecommendation[]
  nextSteps?: string[]
  contentIdeas?: string[]
  raw?: string
}

const TREND_LABEL: Record<string, { text: string; color: string; icon: any }> = {
  up: { text: 'En hausse', color: 'text-emerald-600', icon: TrendingUp },
  stable: { text: 'Stable', color: 'text-amber-500', icon: Activity },
  down: { text: 'En baisse', color: 'text-red-500', icon: TrendingDown },
}

const PRIORITY_COLOR: Record<string, string> = {
  haute: 'bg-red-100 text-red-700 border-red-200',
  moyenne: 'bg-amber-100 text-amber-700 border-amber-200',
  basse: 'bg-slate-100 text-slate-700 border-slate-200',
}

const CATEGORY_ICON: Record<string, any> = {
  fréquence: Calendar,
  format: FileText,
  timing: Clock,
  contenu: Lightbulb,
  engagement: MessageCircle,
}

export function PerformanceIntelligenceTab() {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiResult, setAiResult] = useState<AiResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [provider, setProvider] = useState<string | null>(null)

  const load = () => {
    fetch('/api/performance-intelligence')
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .catch(() => toast.error('Erreur chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleGenerateAi = async () => {
    setAiLoading(true)
    setAiResult(null)
    try {
      const res = await fetch('/api/performance-intelligence', { method: 'POST' })
      const d = await res.json()
      if (!d.success) {
        if (res.status === 403) toast.error(d.error || 'Plan Pro requis')
        else throw new Error(d.error)
        return
      }
      setAiResult(d.data)
      setProvider(d.provider)
      toast.success('Recommandations générées')
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`)
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-80" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500">Impossible de charger les données</p>
      </div>
    )
  }

  const trend = TREND_LABEL[data.contentVelocity.trend] || TREND_LABEL.stable
  const TrendIcon = trend.icon
  const engagementRate = data.kpis.d30.views > 0
    ? ((data.kpis.d30.likes + data.kpis.d30.comments + data.kpis.d30.shares) / data.kpis.d30.views * 100).toFixed(2)
    : '0'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-emerald-600" />
          Performance Intelligence
        </h1>
        <p className="text-slate-500 mt-1">
          Analytics LinkedIn avancés : KPIs, meilleur timing, recommandations IA
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Posts (30j)</span>
              <FileText className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{data.kpis.d30.posts}</p>
            <p className="text-xs text-slate-400 mt-1">{data.kpis.d90.posts} sur 90j</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Vues (30j)</span>
              <Eye className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {data.kpis.d30.views >= 1000 ? `${(data.kpis.d30.views / 1000).toFixed(1)}K` : data.kpis.d30.views}
            </p>
            <p className="text-xs text-slate-400 mt-1">{data.kpis.d14.views} sur 14j</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Engagement (30j)</span>
              <Activity className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{engagementRate}%</p>
            <p className="text-xs text-slate-400 mt-1">
              {data.kpis.d30.likes + data.kpis.d30.comments + data.kpis.d30.shares} interactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Cadence</span>
              <TrendIcon className={`h-4 w-4 ${trend.color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{data.contentVelocity.postsPerWeek}/sem</p>
            <p className={`text-xs mt-1 ${trend.color}`}>{trend.text}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed metrics breakdown */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">14 derniers jours</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <MetricRow icon={ThumbsUp} label="Likes" value={data.kpis.d14.likes} color="text-blue-600" />
            <MetricRow icon={MessageCircle} label="Commentaires" value={data.kpis.d14.comments} color="text-purple-600" />
            <MetricRow icon={Share2} label="Partages" value={data.kpis.d14.shares} color="text-emerald-600" />
            <MetricRow icon={Eye} label="Vues" value={data.kpis.d14.views} color="text-amber-600" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">30 derniers jours</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <MetricRow icon={ThumbsUp} label="Likes" value={data.kpis.d30.likes} color="text-blue-600" />
            <MetricRow icon={MessageCircle} label="Commentaires" value={data.kpis.d30.comments} color="text-purple-600" />
            <MetricRow icon={Share2} label="Partages" value={data.kpis.d30.shares} color="text-emerald-600" />
            <MetricRow icon={Eye} label="Vues" value={data.kpis.d30.views} color="text-amber-600" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">90 derniers jours</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <MetricRow icon={ThumbsUp} label="Likes" value={data.kpis.d90.likes} color="text-blue-600" />
            <MetricRow icon={MessageCircle} label="Commentaires" value={data.kpis.d90.comments} color="text-purple-600" />
            <MetricRow icon={Share2} label="Partages" value={data.kpis.d90.shares} color="text-emerald-600" />
            <MetricRow icon={Eye} label="Vues" value={data.kpis.d90.views} color="text-amber-600" />
          </CardContent>
        </Card>
      </div>

      {/* Best time + status distribution */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              Meilleur créneau de publication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-xs text-slate-500">Jour le plus actif</p>
                <p className="font-semibold text-slate-900">{data.bestTime.day || 'Données insuffisantes'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-slate-500">Heure la plus active</p>
                <p className="font-semibold text-slate-900">{data.bestTime.hour || 'Données insuffisantes'}</p>
              </div>
            </div>
            {Object.keys(data.bestTime.dayDistribution).length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">Distribution par jour</p>
                  <div className="space-y-1.5">
                    {Object.entries(data.bestTime.dayDistribution)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 4)
                      .map(([day, count]) => (
                        <div key={day} className="flex items-center gap-2 text-xs">
                          <span className="w-20 text-slate-600">{day}</span>
                          <Progress value={(count / Math.max(...Object.values(data.bestTime.dayDistribution))) * 100} className="flex-1 h-2" />
                          <span className="text-slate-500 min-w-[20px] text-right">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-600" />
              Statut des posts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(data.statusDistribution).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Aucun post</p>
            ) : (
              Object.entries(data.statusDistribution).map(([status, count]) => {
                const total = Object.values(data.statusDistribution).reduce((a, b) => a + b, 0)
                const pct = (count / total * 100).toFixed(0)
                const colorMap: Record<string, string> = {
                  published: 'bg-emerald-500',
                  approved: 'bg-blue-500',
                  pending: 'bg-amber-500',
                  rejected: 'bg-red-500',
                  failed: 'bg-red-500',
                  publishing: 'bg-purple-500',
                }
                const labelMap: Record<string, string> = {
                  published: 'Publiés',
                  approved: 'Approuvés',
                  pending: 'En attente',
                  rejected: 'Rejetés',
                  failed: 'Échecs',
                  publishing: 'En cours',
                }
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">{labelMap[status] || status}</span>
                      <span className="text-slate-500">{count} ({pct}%)</span>
                    </div>
                    <Progress value={Number(pct)} className={`h-2 ${colorMap[status] || 'bg-slate-300'}`} />
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top posts */}
      {data.topPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Top posts (90 jours)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topPosts.map((p, i) => (
              <div key={p.id} className="flex gap-3 p-3 border border-slate-100 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{p.preview}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{p.engagement}</Badge>
                    {p.publishedAt && (
                      <span className="text-[10px] text-slate-400">
                        {new Date(p.publishedAt).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                Recommandations IA
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Plan Pro requis · Analyse personnalisée de votre performance
              </CardDescription>
            </div>
            <Button
              onClick={handleGenerateAi}
              disabled={aiLoading}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {aiLoading ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Analyse...</>
              ) : aiResult ? (
                <><Zap className="h-3.5 w-3.5 mr-1.5" /> Régénérer</>
              ) : (
                <><Zap className="h-3.5 w-3.5 mr-1.5" /> Générer</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!aiResult && !aiLoading && (
            <div className="text-center py-8 text-slate-400">
              <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Cliquez sur "Générer" pour obtenir un plan d'action personnalisé</p>
            </div>
          )}
          {aiLoading && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-4" />)}
            </div>
          )}
          {aiResult?.raw && (
            <div className="text-sm text-slate-700 whitespace-pre-wrap">{aiResult.raw}</div>
          )}
          {aiResult?.score !== undefined && (
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-3xl font-bold text-emerald-600">{aiResult.score}/100</div>
              <p className="text-xs text-slate-500 mt-1">Score de performance</p>
            </div>
          )}
          {aiResult?.summary && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-sm text-slate-700">{aiResult.summary}</p>
              {provider && <p className="text-[10px] text-slate-400 mt-1">Généré par {provider}</p>}
            </div>
          )}
          {aiResult?.strengths && aiResult.strengths.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Forces
              </h4>
              <ul className="space-y-1">
                {aiResult.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-emerald-500">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {aiResult?.weaknesses && aiResult.weaknesses.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-amber-500" /> Axes d'amélioration
              </h4>
              <ul className="space-y-1">
                {aiResult.weaknesses.map((s, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-amber-500">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {aiResult?.recommendations && aiResult.recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase text-slate-500">Recommandations</h4>
              {aiResult.recommendations.map((r, i) => {
                const Icon = (r.category && CATEGORY_ICON[r.category]) || Lightbulb
                return (
                  <div key={i} className="flex gap-3 p-2 border border-slate-100 rounded-lg">
                    <Icon className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{r.title}</p>
                        {r.priority && (
                          <Badge variant="outline" className={`text-[9px] ${PRIORITY_COLOR[r.priority] || ''}`}>
                            {r.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
                      {r.category && <p className="text-[10px] text-slate-400 mt-0.5 uppercase">{r.category}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {aiResult?.nextSteps && aiResult.nextSteps.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1">
                <Target className="h-3 w-3 text-blue-500" /> Prochaines actions
              </h4>
              <ol className="space-y-1">
                {aiResult.nextSteps.map((s, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-blue-500 font-semibold">{i + 1}.</span> {s}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {aiResult?.contentIdeas && aiResult.contentIdeas.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1">
                <Lightbulb className="h-3 w-3 text-amber-500" /> Idées de posts
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {aiResult.contentIdeas.map((s, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-amber-50 border-amber-200">{s}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricRow({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className="text-slate-600 flex-1">{label}</span>
      <span className="font-semibold text-slate-900">{value.toLocaleString('fr-FR')}</span>
    </div>
  )
}
