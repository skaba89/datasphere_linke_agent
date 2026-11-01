'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  DollarSign, TrendingUp, Plus, Trash2, Loader2, Users, Target,
  Award, AlertCircle, Calendar
} from 'lucide-react'

// ============================================================
// REVENUE ATTRIBUTION STUDIO TAB
// ============================================================

type Entry = {
  id: string
  amountCents: number
  currency: string
  source: string
  description: string | null
  attributedAt: string
  client: { id: string; name: string; color: string } | null
  prospect: { id: string; name: string; company: string | null } | null
}

type Stats = {
  totalCents: number
  totalEntries: number
  byClient: Array<{ id: string; name: string; color: string; totalCents: number; count: number }>
  byProspect: Array<{ id: string; name: string; totalCents: number; count: number }>
  byMonth: Record<string, number>
}

const formatEuros = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manuel',
  stripe: 'Stripe',
  import: 'Import',
}

const SOURCE_COLORS: Record<string, string> = {
  manual: 'bg-slate-100 text-slate-700',
  stripe: 'bg-purple-100 text-purple-700',
  import: 'bg-blue-100 text-blue-700',
}

export function RevenueAttributionTab() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [period, setPeriod] = useState<'30d' | '90d' | 'ytd' | 'all'>('ytd')
  const [clients, setClients] = useState<any[]>([])
  const [prospects, setProspects] = useState<any[]>([])
  const [form, setForm] = useState({
    targetType: 'client' as 'client' | 'prospect',
    clientId: '',
    prospectId: '',
    amountEuros: '',
    description: '',
    attributedAt: new Date().toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`/api/revenue-attribution?period=${period}`)
      .then(r => {
        if (r.status === 403) { setForbidden(true); return null }
        return r.json()
      })
      .then(d => {
        if (d?.success) {
          setEntries(d.data)
          setStats(d.stats)
        }
      })
      .catch(() => toast.error('Erreur chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [period])

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/prospects').then(r => r.json()),
    ]).then(([c, p]) => {
      if (c.success) setClients(c.data)
      if (p.success) setProspects(p.data)
    }).catch(() => {})
  }, [])

  const handleAdd = async () => {
    const amountEuros = parseFloat(form.amountEuros)
    if (isNaN(amountEuros) || amountEuros <= 0) {
      toast.error('Montant invalide')
      return
    }
    if (form.targetType === 'client' && !form.clientId) {
      toast.error('Sélectionnez un client')
      return
    }
    if (form.targetType === 'prospect' && !form.prospectId) {
      toast.error('Sélectionnez un prospect')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/revenue-attribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: form.targetType === 'client' ? form.clientId : undefined,
          prospectId: form.targetType === 'prospect' ? form.prospectId : undefined,
          amountCents: Math.round(amountEuros * 100),
          description: form.description || undefined,
          attributedAt: form.attributedAt ? new Date(form.attributedAt).toISOString() : undefined,
        }),
      })
      const d = await res.json()
      if (!d.success) {
        if (res.status === 403) toast.error(d.error || 'Plan Business requis')
        else throw new Error(d.error)
        return
      }
      toast.success('Revenu attribué')
      setForm({
        ...form,
        amountEuros: '',
        description: '',
        clientId: '',
        prospectId: '',
      })
      setShowAdd(false)
      load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette entrée de revenu ?')) return
    try {
      const res = await fetch(`/api/revenue-attribution/${id}`, { method: 'DELETE' })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      toast.success('Supprimé')
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (forbidden) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-emerald-600" />
            Revenue Attribution
          </h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-emerald-300 mb-3" />
            <p className="text-slate-700 font-medium">Plan Business requis</p>
            <p className="text-sm text-slate-500 mt-1">
              Revenue Attribution Studio est disponible avec les plans Business et Agency.
            </p>
            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => window.location.href = '/pricing'}>
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

  const topClients = (stats?.byClient || []).sort((a, b) => b.totalCents - a.totalCents).slice(0, 5)
  const topProspects = (stats?.byProspect || []).sort((a, b) => b.totalCents - a.totalCents).slice(0, 5)
  const monthsList = Object.entries(stats?.byMonth || {}).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6).reverse()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-emerald-600" />
            Revenue Attribution
          </h1>
          <p className="text-slate-500 mt-1">
            Attribuez et suivez le revenu par client et par prospect
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as any)}
            className="px-3 py-1.5 rounded-md border border-slate-200 text-sm"
          >
            <option value="30d">30 jours</option>
            <option value="90d">90 jours</option>
            <option value="ytd">Année</option>
            <option value="all">Tout</option>
          </select>
          <Button onClick={() => setShowAdd(!showAdd)}><Plus className="h-4 w-4 mr-1.5" />Attribuer</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Revenu total</span>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700">{formatEuros(stats?.totalCents || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Entrées</span>
              <Target className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats?.totalEntries || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Clients avec revenu</span>
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats?.byClient.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Prospects convertis</span>
              <Award className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats?.byProspect.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add form */}
      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nouvelle attribution de revenu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={form.targetType === 'client' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm({ ...form, targetType: 'client' })}
              >
                <Users className="h-3 w-3 mr-1" /> Client
              </Button>
              <Button
                type="button"
                variant={form.targetType === 'prospect' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm({ ...form, targetType: 'prospect' })}
              >
                <Target className="h-3 w-3 mr-1" /> Prospect
              </Button>
            </div>
            {form.targetType === 'client' ? (
              <div>
                <Label className="text-xs">Client *</Label>
                <select
                  value={form.clientId}
                  onChange={e => setForm({ ...form, clientId: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm"
                >
                  <option value="">— Sélectionner —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <Label className="text-xs">Prospect *</Label>
                <select
                  value={form.prospectId}
                  onChange={e => setForm({ ...form, prospectId: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm"
                >
                  <option value="">— Sélectionner —</option>
                  {prospects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.company ? `· ${p.company}` : ''} [{p.stage}]
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Montant (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amountEuros}
                  onChange={e => setForm({ ...form, amountEuros: e.target.value })}
                  placeholder="99.99"
                />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={form.attributedAt}
                  onChange={e => setForm({ ...form, attributedAt: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Description (optionnel)</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: Contrat annuel signé"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Enregistrement...</> : 'Attribuer'}
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Top clients by revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Top clients par revenu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topClients.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Aucun revenu attribué</p>
            ) : (
              topClients.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <div className="w-2 h-8 rounded" style={{ background: c.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.count} entrée(s)</p>
                  </div>
                  <span className="font-semibold text-emerald-700">{formatEuros(c.totalCents)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top prospects by revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Top prospects convertis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topProspects.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Aucun prospect converti</p>
            ) : (
              topProspects.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.count} entrée(s)</p>
                  </div>
                  <span className="font-semibold text-emerald-700">{formatEuros(p.totalCents)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly trend */}
      {monthsList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Évolution mensuelle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monthsList.map(([month, cents]) => {
                const max = Math.max(...monthsList.map(m => m[1]), 1)
                const pct = (cents / max) * 100
                return (
                  <div key={month} className="flex items-center gap-3 text-xs">
                    <span className="w-20 text-slate-600">{new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                    <div className="flex-1 h-4 bg-slate-100 rounded relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="font-semibold text-emerald-700 min-w-[80px] text-right">{formatEuros(cents)}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All entries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Historique ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucune attribution pour cette période</p>
              <p className="text-xs text-slate-400 mt-1">Cliquez sur "Attribuer" pour ajouter du revenu</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {entries.map(e => (
                <div key={e.id} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                    €
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {formatEuros(e.amountCents)}
                      {e.client && <span className="text-slate-500 font-normal"> · {e.client.name}</span>}
                      {e.prospect && !e.client && <span className="text-slate-500 font-normal"> · {e.prospect.name}</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {e.description || 'Sans description'} · {new Date(e.attributedAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${SOURCE_COLORS[e.source] || ''}`}>
                    {SOURCE_LABELS[e.source] || e.source}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-500 hover:bg-red-50"
                    onClick={() => handleDelete(e.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
