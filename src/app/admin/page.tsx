'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ArrowLeft, Users, FileText, Linkedin, TrendingUp, Crown } from 'lucide-react'

interface AdminStats {
  users: {
    total: number
    byPlan: Record<string, number>
    newThisWeek: number
    activeSubscriptions: number
    recent: Array<{
      id: string
      email: string
      name: string | null
      plan: string
      createdAt: string
      trialEndsAt: string | null
      stripeSubscriptionStatus: string | null
    }>
  }
  content: {
    totalPosts: number
    publishedPosts: number
    linkedinAccounts: number
  }
  teams: number
  revenue: { monthlyEstimated: number; currency: string }
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      if (!data.success) {
        if (res.status === 403) {
          setError('Accès refusé. Vous devez être admin.')
        } else {
          setError(data.error)
        }
      } else {
        setStats(data.data)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleUpdateUserPlan = async (userId: string, plan: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success(`Plan mis à jour: ${plan}`)
      await loadStats()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Accès refusé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">{error}</p>
            <Link href="/">
              <Button variant="outline">← Retour au dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Crown className="h-6 w-6 text-amber-500" />
            LinkedInPost Admin
          </div>
          <Link href="/" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Tableau de bord admin</h1>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Utilisateurs</p>
                  <p className="text-2xl font-bold">{stats.users.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-xs text-emerald-600 mt-1">+{stats.users.newThisWeek} cette semaine</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Abonnements actifs</p>
                  <p className="text-2xl font-bold">{stats.users.activeSubscriptions}</p>
                </div>
                <Crown className="h-8 w-8 text-amber-500" />
              </div>
              <p className="text-xs text-slate-500 mt-1">{stats.users.byPlan.business || 0} Business · {stats.users.byPlan.pro || 0} Pro</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Posts publiés</p>
                  <p className="text-2xl font-bold">{stats.content.publishedPosts}</p>
                </div>
                <FileText className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="text-xs text-slate-500 mt-1">{stats.content.totalPosts} générés au total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Revenue mensuel</p>
                  <p className="text-2xl font-bold">{stats.revenue.monthlyEstimated}€</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-xs text-slate-500 mt-1">Estimation</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Répartition par plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Répartition par plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {['free', 'pro', 'business'].map((plan) => (
                <div key={plan} className="flex items-center justify-between">
                  <Badge variant="outline" className="capitalize">{plan}</Badge>
                  <span className="font-semibold">{stats.users.byPlan[plan] || 0}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-500">Comptes LinkedIn actifs</span>
                <span className="font-semibold flex items-center gap-1">
                  <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                  {stats.content.linkedinAccounts}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Équipes</span>
                <span className="font-semibold">{stats.teams}</span>
              </div>
            </CardContent>
          </Card>

          {/* Users récents */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Utilisateurs récents (10 derniers)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.users.recent.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {u.name || u.email}
                        {u.name && <span className="text-slate-400 ml-2 text-xs">({u.email})</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        Inscrit le {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                        {u.trialEndsAt && ` · Trial jusqu'au ${new Date(u.trialEndsAt).toLocaleDateString('fr-FR')}`}
                      </p>
                    </div>
                    <select
                      value={u.plan}
                      onChange={(e) => handleUpdateUserPlan(u.id, e.target.value)}
                      className="text-xs border border-slate-200 rounded px-2 py-1"
                    >
                      <option value="free">free</option>
                      <option value="pro">pro</option>
                      <option value="business">business</option>
                    </select>
                    {u.stripeSubscriptionStatus === 'active' && (
                      <Badge className="bg-emerald-100 text-emerald-700">Payant</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
