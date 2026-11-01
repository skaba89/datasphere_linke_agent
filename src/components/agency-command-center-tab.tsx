'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Layers, AlertTriangle, AlertCircle, TrendingDown,
  Users, FileText, CheckCircle2, Activity, Trophy,
  Calendar
} from 'lucide-react'

// ============================================================
// AGENCY COMMAND CENTER TAB
// Vue multi-clients avancée pour les agences (plan Business+)
// ============================================================

type GlobalKpis = {
  totalClients: number
  activeClients: number
  totalPosts: number
  publishedThisMonth: number
  monthlyGoal: number
  publicationRate: number
  successRate: number
}

type ClientStat = {
  id: string
  name: string
  color: string
  active: boolean
  totalPosts: number
  publishedThisMonth: number
  pending: number
  failed: number
  monthlyGoal: number
  goalProgress: number
  lastPostAt: string | null
}

type Alert = {
  type: string
  severity: string
  clientId: string
  clientName: string
  message: string
}

type CommandData = {
  globalKpis: GlobalKpis
  topClients: ClientStat[]
  laggingClients: ClientStat[]
  weeklyTrend: { date: string; count: number }[]
  statusHealth: Record<string, number>
  alerts: Alert[]
}

const STATUS_LABELS: Record<string, string> = {
  published: 'Publiés',
  approved: 'Approuvés',
  pending: 'En attente',
  rejected: 'Rejetés',
  failed: 'Échecs',
  publishing: 'En cours',
}

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-emerald-500',
  approved: 'bg-blue-500',
  pending: 'bg-amber-500',
  rejected: 'bg-red-500',
  failed: 'bg-red-500',
  publishing: 'bg-purple-500',
}

const SEVERITY_STYLE: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  critical: { icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  warning: { icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  info: { icon: AlertCircle, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
}

export function AgencyCommandCenterTab() {
  const [data, setData] = useState<CommandData | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  const load = () => {
    fetch('/api/agency-command-center')
      .then(r => {
        if (r.status === 403) {
          setForbidden(true)
          return null
        }
        return r.json()
      })
      .then(d => { if (d?.success) setData(d.data) })
      .catch(() => toast.error('Erreur chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (forbidden) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-7 w-7 text-purple-600" />
            Agency Command Center
          </h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <Layers className="h-12 w-12 mx-auto text-purple-300 mb-3" />
            <p className="text-slate-700 font-medium">Plan Business requis</p>
            <p className="text-sm text-slate-500 mt-1">
              L'Agency Command Center est disponible avec les plans Business et Agency.
            </p>
            <Button className="mt-4 bg-purple-600 hover:bg-purple-700" onClick={() => window.location.href = '/pricing'}>
              Voir les plans
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-80" />
        <div className="grid md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
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

  const k = data.globalKpis
  const maxTrend = Math.max(...data.weeklyTrend.map(d => d.count), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Layers className="h-7 w-7 text-purple-600" />
          Agency Command Center
        </h1>
        <p className="text-slate-500 mt-1">
          Vue stratégique multi-clients : KPIs, top clients, retards, alertes
        </p>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Clients actifs</span>
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{k.activeClients}<span className="text-sm text-slate-400">/{k.totalClients}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Posts ce mois</span>
              <FileText className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{k.publishedThisMonth}<span className="text-sm text-slate-400">/{k.monthlyGoal}</span></p>
            <Progress value={k.monthlyGoal > 0 ? (k.publishedThisMonth / k.monthlyGoal) * 100 : 0} className="h-1 mt-2 bg-purple-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Taux publication</span>
              <Activity className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{k.publicationRate}%</p>
            <p className="text-[10px] text-slate-400 mt-1">posts publiés / total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Taux succès</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{k.successRate}%</p>
            <p className="text-[10px] text-slate-400 mt-1">publiés / (publiés+échecs)</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertes ({data.alerts.length})
            </CardTitle>
            <CardDescription>Actions requises sur vos clients</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.alerts.slice(0, 8).map((a, i) => {
              const style = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.info
              const Icon = style.icon
              return (
                <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border ${style.bg} ${style.border}`}>
                  <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${style.color}`} />
                  <p className="text-sm text-slate-700 flex-1">{a.message}</p>
                  <Badge variant="outline" className={`text-[9px] ${style.color} bg-white/50`}>
                    {a.severity}
                  </Badge>
                </div>
              )
            })}
            {data.alerts.length > 8 && (
              <p className="text-xs text-slate-400 text-center pt-2">+{data.alerts.length - 8} autres alertes</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Top clients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top clients (mois en cours)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topClients.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Aucun post publié ce mois</p>
            ) : (
              data.topClients.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <div className="w-2 h-8 rounded" style={{ background: c.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-500">
                      {c.publishedThisMonth}/{c.monthlyGoal} · {c.goalProgress}%
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    {c.publishedThisMonth} posts
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Lagging clients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Clients en retard
            </CardTitle>
            <CardDescription>&lt; 50% de l'objectif mensuel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.laggingClients.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1" />
                <p className="text-sm text-slate-500">Tous les clients sont sur la bonne voie</p>
              </div>
            ) : (
              data.laggingClients.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border border-red-100 bg-red-50/30">
                  <div className="w-2 h-8 rounded" style={{ background: c.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-500">
                      {c.publishedThisMonth}/{c.monthlyGoal} posts · {c.goalProgress}%
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                    {c.goalProgress}%
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Weekly trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              Tendance 14 jours
            </CardTitle>
            <CardDescription>Posts publiés par jour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {data.weeklyTrend.map((d, i) => {
                const heightPct = (d.count / maxTrend) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-emerald-200 rounded-t-sm relative group" style={{ height: `${heightPct}%`, minHeight: d.count > 0 ? '4px' : '0' }}>
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 opacity-0 group-hover:opacity-100">
                        {d.count}
                      </div>
                    </div>
                    <span className="text-[8px] text-slate-400">
                      {new Date(d.date).getDate()}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Status health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              Santé des posts
            </CardTitle>
            <CardDescription>Distribution des statuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.keys(data.statusHealth).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Aucun post</p>
            ) : (
              Object.entries(data.statusHealth).map(([status, count]) => {
                const total = Object.values(data.statusHealth).reduce((a, b) => a + b, 0)
                const pct = (count / total * 100).toFixed(0)
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">{STATUS_LABELS[status] || status}</span>
                      <span className="text-slate-500">{count} ({pct}%)</span>
                    </div>
                    <Progress value={Number(pct)} className={`h-2 ${STATUS_COLORS[status] || 'bg-slate-300'}`} />
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
