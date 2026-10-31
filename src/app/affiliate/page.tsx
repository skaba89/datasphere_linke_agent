'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Gift, Users, TrendingUp, Wallet, Copy, ArrowLeft } from 'lucide-react'

interface AffiliateData {
  referralCode: string
  totalReferrals: number
  convertedReferrals: number
  pendingCommission: number
  paidCommission: number
  referrals: Array<{
    id: string
    status: string
    commissionAmount: number
    convertedAt: string | null
    createdAt: string
    referred: { email: string; plan: string } | null
  }>
  payouts: Array<{
    id: string
    amount: number
    period: string
    status: string
    paidAt: string | null
  }>
}

export default function AffiliatePage() {
  const [data, setData] = useState<AffiliateData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/affiliate')
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [])

  const copyLink = () => {
    if (!data) return
    const link = `${window.location.origin}/register?ref=${data.referralCode}`
    navigator.clipboard.writeText(link)
    toast.success('Lien copié !')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Gift className="h-6 w-6 text-purple-600" />
            Programme d'affiliation
          </div>
          <Link href="/" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Parrainez et gagnez 20%</h1>
          <p className="text-slate-600 mt-2">
            Partagez votre lien, gagnez 20% du MRR de chaque client référé, à vie.
            Paiements mensuels dès 50€ cumulés.
          </p>
        </div>

        {/* Lien de parrainage */}
        <Card className="mb-8 border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-lg">Votre lien de parrainage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 bg-white rounded-lg border border-purple-200 text-sm font-mono truncate">
                {typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${data?.referralCode}` : `/register?ref=${data?.referralCode}`}
              </code>
              <Button onClick={copyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copier
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Code : <strong>{data?.referralCode}</strong>
            </p>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-5">
              <Users className="h-6 w-6 text-blue-500 mb-2" />
              <p className="text-2xl font-bold">{data?.totalReferrals || 0}</p>
              <p className="text-xs text-slate-500">Parrainages</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <TrendingUp className="h-6 w-6 text-emerald-500 mb-2" />
              <p className="text-2xl font-bold">{data?.convertedReferrals || 0}</p>
              <p className="text-xs text-slate-500">Convertis</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <Wallet className="h-6 w-6 text-amber-500 mb-2" />
              <p className="text-2xl font-bold">{((data?.pendingCommission || 0) / 100).toFixed(2)}€</p>
              <p className="text-xs text-slate-500">En attente</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <Gift className="h-6 w-6 text-purple-500 mb-2" />
              <p className="text-2xl font-bold">{((data?.paidCommission || 0) / 100).toFixed(2)}€</p>
              <p className="text-xs text-slate-500">Versés</p>
            </CardContent>
          </Card>
        </div>

        {/* Liste des parrainages */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Vos parrainages</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.referrals.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Aucun parrainage pour le moment. Partagez votre lien pour commencer !
              </p>
            ) : (
              <div className="space-y-2">
                {data?.referrals.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{r.referred?.email || 'Utilisateur'}</p>
                      <p className="text-xs text-slate-500">
                        Inscrit le {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                        {r.convertedAt && ` · Converti le ${new Date(r.convertedAt).toLocaleDateString('fr-FR')}`}
                      </p>
                    </div>
                    <Badge variant={
                      r.status === 'paid' ? 'default' :
                      r.status === 'converted' ? 'secondary' :
                      'outline'
                    }>
                      {r.status === 'paid' ? 'Payé' :
                       r.status === 'converted' ? 'Converti' :
                       'En attente'}
                    </Badge>
                    {r.commissionAmount > 0 && (
                      <span className="text-sm font-semibold text-emerald-600">
                        +{(r.commissionAmount / 100).toFixed(2)}€
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payouts */}
        {data?.payouts && data.payouts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historique des paiements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                    <div>
                      <p className="text-sm font-medium">Période : {p.period}</p>
                      <p className="text-xs text-slate-500">
                        {p.paidAt ? `Versé le ${new Date(p.paidAt).toLocaleDateString('fr-FR')}` : 'En cours de traitement'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{(p.amount / 100).toFixed(2)}€</span>
                      <Badge variant={p.status === 'paid' ? 'default' : 'outline'}>{p.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
