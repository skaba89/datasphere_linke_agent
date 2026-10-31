'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Users, FileText, Calendar, TrendingUp, Check, X, AlertCircle,
  Plus, Activity, Target, ChevronRight, Sparkles, Loader2
} from 'lucide-react'

interface DashboardData {
  stats: {
    activeClients: number
    totalPosts: number
    publishedThisMonth: number
    monthlyGoal: number
    publicationRate: number
  }
  clientPerformance: Array<{
    id: string
    name: string
    color: string
    totalPosts: number
    pending: number
    publishedThisMonth: number
    monthlyGoal: number
    goalProgress: number
    createdAt: string
  }>
  recentActivity: Array<{
    id: string
    title: string
    status: string
    publishedAt: string | null
    createdAt: string
    clientId: string | null
  }>
}

export function AgencyDashboard({ user, onNav }: { user: any; onNav?: (tab: string) => void }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddClient, setShowAddClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientGoal, setNewClientGoal] = useState('20')
  const [adding, setAdding] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const loadDashboard = () => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadDashboard() }, [])

  const handleAddClient = async () => {
    if (!newClientName.trim()) { toast.error('Nom requis'); return }
    setAdding(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClientName, monthlyGoal: parseInt(newClientGoal) || 20 }),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      toast.success(`Client "${newClientName}" créé !`)
      setNewClientName('')
      setShowAddClient(false)
      loadDashboard()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAdding(false)
    }
  }

  const handleSeedDemo = async () => {
    if (!confirm('Créer 2 clients de démo + ~32 posts ? Cela peuplera votre dashboard.')) return
    setSeeding(true)
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      toast.success(`${d.data.clientsCreated} clients et ${d.data.postsCreated} posts créés !`)
      loadDashboard()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSeeding(false)
    }
  }

  const firstName = user?.name?.split(' ')[0] || (user?.email ? user.email.split('@')[0] : '')

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!data) {
    return <div className="text-center py-8 text-slate-400">Erreur de chargement</div>
  }

  const { stats, clientPerformance, recentActivity } = data

  const statCards = [
    {
      label: 'Clients actifs',
      value: stats.activeClients,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      suffix: '',
    },
    {
      label: 'Total posts',
      value: stats.totalPosts,
      icon: FileText,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      suffix: '',
    },
    {
      label: 'Publiés ce mois',
      value: `${stats.publishedThisMonth}`,
      subValue: `Objectif: ${stats.monthlyGoal}`,
      icon: Calendar,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      suffix: '',
    },
    {
      label: 'Taux de publication',
      value: stats.publicationRate,
      icon: TrendingUp,
      color: stats.publicationRate >= 80 ? 'text-emerald-600' : 'text-amber-600',
      bg: stats.publicationRate >= 80 ? 'bg-emerald-50' : 'bg-amber-50',
      suffix: '%',
      subValue: stats.publicationRate >= 80 ? 'Excellent' : 'À améliorer',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Bonjour {firstName} 👋</h1>
          <p className="text-slate-500 mt-1">Voici un aperçu de votre activité LinkedIn</p>
        </div>
        <div className="flex gap-2">
          {stats.activeClients === 0 && (
            <Button
              onClick={handleSeedDemo}
              disabled={seeding}
              variant="outline"
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Données de démo
            </Button>
          )}
          <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau client</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nom du client</Label>
                  <Input
                    id="clientName"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="ex: Team DataSphere"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddClient()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientGoal">Objectif mensuel (posts/mois)</Label>
                  <Input
                    id="clientGoal"
                    type="number"
                    min="1"
                    max="100"
                    value={newClientGoal}
                    onChange={(e) => setNewClientGoal(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddClient(false)}>Annuler</Button>
                <Button onClick={handleAddClient} disabled={adding || !newClientName.trim()}>
                  {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card key={i} className="border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <Icon className={`h-4.5 w-4.5 ${stat.color}`} />
                  </div>
                  {stat.subValue && (
                    <Badge variant="secondary" className={`text-xs ${stat.color === 'text-emerald-600' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
                      {stat.subValue}
                    </Badge>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-slate-900">
                    {stat.value}{stat.suffix}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Client Performance */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Performance clients</CardTitle>
        </CardHeader>
        <CardContent>
          {clientPerformance.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-1">Aucun client pour le moment</p>
              <p className="text-sm text-slate-400">Ajoutez un client pour commencer à suivre ses performances</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientPerformance.map(client => (
                <div key={client.id} className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: client.color }} />
                      <h4 className="font-semibold text-slate-900">{client.name}</h4>
                    </div>
                    <span className="text-xs text-slate-400">Depuis {new Date(client.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center mb-3">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{client.totalPosts}</p>
                      <p className="text-[10px] text-slate-500 uppercase">Total</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-600">{client.pending}</p>
                      <p className="text-[10px] text-slate-500 uppercase">À valider</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-600">{client.publishedThisMonth}</p>
                      <p className="text-[10px] text-slate-500 uppercase">Ce mois</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900">{client.monthlyGoal}</p>
                      <p className="text-[10px] text-slate-500 uppercase">Objectif</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Objectif mensuel</span>
                      <span className="font-medium">{client.publishedThisMonth}/{client.monthlyGoal} ({client.goalProgress}%)</span>
                    </div>
                    <Progress value={client.goalProgress} className="h-2" />
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onNav?.('proposals')}>Voir posts</Button>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onNav?.('reports')}>Voir rapport</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Comparison + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Comparison */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Comparaison de performance</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.publishedThisMonth === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Aucune publication ce mois</p>
                <p className="text-xs text-slate-400 mt-1">Les données apparaîtront après les premières publications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientPerformance.map(c => (
                  <div key={c.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium" style={{ color: c.color }}>{c.name}</span>
                      <span className="text-slate-600">{c.publishedThisMonth}/{c.monthlyGoal}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${c.goalProgress}%`, backgroundColor: c.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Aucune activité récente</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      activity.status === 'published' ? 'bg-emerald-500' :
                      activity.status === 'failed' ? 'bg-red-500' :
                      activity.status === 'approved' ? 'bg-blue-500' :
                      'bg-slate-300'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{activity.title}</p>
                      <p className="text-xs text-slate-400">
                        {activity.publishedAt
                          ? new Date(activity.publishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                          : new Date(activity.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                        }
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-xs flex-shrink-0 ${
                      activity.status === 'published' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
                      activity.status === 'failed' ? 'text-red-600 border-red-200 bg-red-50' :
                      activity.status === 'approved' ? 'text-blue-600 border-blue-200 bg-blue-50' :
                      'text-slate-500'
                    }`}>
                      {activity.status === 'published' ? 'Publié' :
                       activity.status === 'failed' ? 'Échoué' :
                       activity.status === 'approved' ? 'Approuvé' :
                       activity.status === 'rejected' ? 'Rejeté' :
                       'En attente'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
