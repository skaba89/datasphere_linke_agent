'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Settings as SettingsIcon, User, Shield, Key, CreditCard, Gift,
  Check, X, Plus, Trash2, Copy, Crown, AlertCircle, Loader2
} from 'lucide-react'

type Tab = 'account' | 'security' | 'api-keys' | 'billing' | 'affiliate'

export default function SettingsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('account')
  const [user, setUser] = useState<any>(null)
  const [billing, setBilling] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/billing').then(r => r.json()),
    ]).then(([meData, billingData]) => {
      if (meData.success) setUser(meData.data)
      if (billingData.success) setBilling(billingData.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  if (!user) {
    router.push('/login')
    return null
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'account', label: 'Compte', icon: User },
    { id: 'security', label: 'Sécurité & 2FA', icon: Shield },
    { id: 'api-keys', label: 'Clés API', icon: Key },
    { id: 'billing', label: 'Abonnement', icon: CreditCard },
    { id: 'affiliate', label: 'Affiliation', icon: Gift },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <SettingsIcon className="h-6 w-6 text-slate-700" />
            Paramètres
          </div>
          <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">← Dashboard</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="md:w-56 shrink-0">
            <nav className="space-y-1">
              {tabs.map(t => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      tab === t.id
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                )
              })}
            </nav>
          </aside>

          <div className="flex-1 min-w-0">
            {tab === 'account' && <AccountTab user={user} />}
            {tab === 'security' && <SecurityTab />}
            {tab === 'api-keys' && <ApiKeysTab user={user} />}
            {tab === 'billing' && <BillingTab billing={billing} />}
            {tab === 'affiliate' && <AffiliateTab />}
          </div>
        </div>
      </main>
    </div>
  )
}

function AccountTab({ user }: { user: any }) {
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      toast.success('Profil mis à jour')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations du compte</CardTitle>
        <CardDescription>Vos informations personnelles</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Nom complet</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email || ''} disabled className="bg-slate-50" />
          <p className="text-xs text-slate-500">L'email ne peut pas être modifié.</p>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Badge variant="outline" className="capitalize">Plan {user?.plan}</Badge>
          {user?.trialActive && <Badge className="bg-amber-100 text-amber-700">Essai en cours</Badge>}
        </div>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Sauvegarde...' : 'Mettre à jour'}</Button>
      </CardContent>
    </Card>
  )
}

function SecurityTab() {
  const [setupPhase, setSetupPhase] = useState<'idle' | 'qr' | 'verify' | 'done'>('idle')
  const [qrData, setQrData] = useState<any>(null)
  const [token, setToken] = useState('')
  const [secret, setSecret] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [disableToken, setDisableToken] = useState('')

  const startSetup = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/2fa/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setQrData(data.data)
      setSecret(data.data.secret)
      setSetupPhase('qr')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const verifyAndEnable = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, secret }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setBackupCodes(data.data.backupCodes)
      setSetupPhase('done')
      toast.success('2FA activé !')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async () => {
    if (!disableToken) { toast.error('Entrez votre code TOTP'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: disableToken }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setSetupPhase('idle')
      setDisableToken('')
      toast.success('2FA désactivé')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Authentification 2FA</CardTitle>
        <CardDescription>Sécurisez votre compte avec TOTP (Google Authenticator, Authy, 1Password...)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {setupPhase === 'idle' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">2FA non activé</p>
                <p className="text-sm text-amber-700">Recommandé pour sécuriser votre compte.</p>
              </div>
            </div>
            <Button onClick={startSetup} disabled={loading}>{loading ? 'Génération...' : 'Activer le 2FA'}</Button>
          </div>
        )}
        {setupPhase === 'qr' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Scannez ce QR code avec votre app :</p>
            {qrData?.qrCode && <div className="flex justify-center"><img src={qrData.qrCode} alt="QR" className="border rounded-lg" /></div>}
            <div className="space-y-2">
              <Label>Ou entrez ce secret manuellement :</Label>
              <code className="block p-3 bg-slate-50 rounded-lg text-xs font-mono break-all">{secret}</code>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Code à 6 chiffres :</Label>
              <Input value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="font-mono text-lg tracking-widest text-center" maxLength={6} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSetupPhase('idle')}>Annuler</Button>
              <Button onClick={verifyAndEnable} disabled={token.length !== 6 || loading}>{loading ? 'Vérification...' : 'Vérifier & activer'}</Button>
            </div>
          </div>
        )}
        {setupPhase === 'done' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <Check className="h-5 w-5 text-emerald-600 mb-2" />
              <p className="font-medium text-emerald-900">2FA activé !</p>
              <p className="text-sm text-emerald-700 mt-1">Sauvegardez ces codes de secours :</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, i) => <div key={i} className="px-2 py-1 bg-white rounded border text-center">{code}</div>)}
              </div>
            </div>
            <Button onClick={() => setSetupPhase('idle')}>Terminé</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ApiKeysTab({ user }: { user: any }) {
  const [keys, setKeys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const loadKeys = async () => {
    try {
      const res = await fetch('/api/api-keys')
      const data = await res.json()
      if (data.success) setKeys(data.data)
    } catch (err: any) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadKeys() }, [])

  const handleCreate = async () => {
    if (!newKeyName.trim()) return
    try {
      const res = await fetch('/api/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newKeyName }) })
      const data = await res.json()
      if (!data.success) {
        if (res.status === 402) { toast.error('Plan Business requis'); return }
        throw new Error(data.error)
      }
      setCreatedKey(data.data.key)
      setNewKeyName('')
      setShowCreate(false)
      await loadKeys()
      toast.success('Clé API créée')
    } catch (err: any) { toast.error(err.message) }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Révoquer cette clé ?')) return
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      await loadKeys()
      toast.success('Clé révoquée')
    } catch (err: any) { toast.error(err.message) }
  }

  if (loading) return <Loader2 className="h-6 w-6 animate-spin" />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />Clés API <Badge variant="outline">Business</Badge></CardTitle>
        <CardDescription>Accédez à l'API REST publique (/api/v1/*)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {createdKey && (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-300">
            <p className="font-medium text-amber-900 mb-2">⚠️ Copiez votre clé maintenant, elle ne sera plus affichée.</p>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 bg-white rounded border text-xs font-mono break-all">{createdKey}</code>
              <Button size="sm" onClick={() => { navigator.clipboard.writeText(createdKey); toast.success('Copié') }}><Copy className="h-4 w-4" /></Button>
            </div>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setCreatedKey(null)}>J'ai copié ma clé</Button>
          </div>
        )}
        {showCreate ? (
          <div className="space-y-2 p-4 border rounded-lg">
            <Label>Nom de la clé</Label>
            <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="ex: Production, Zapier..." />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate}>Créer</Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Créer une clé</Button>
        )}
        {keys.length > 0 && (
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <Key className="h-4 w-4 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{k.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{k.keyPrefix}...</p>
                </div>
                {k.revokedAt ? <Badge variant="outline" className="text-red-600">Révoquée</Badge> : (
                  <Button size="icon" variant="ghost" className="text-red-500" onClick={() => handleRevoke(k.id)}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BillingTab({ billing }: { billing: any }) {
  const [loading, setLoading] = useState(false)
  if (!billing) return <Loader2 className="h-6 w-6 animate-spin" />
  const { user, limits } = billing

  const openPortal = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      window.location.href = data.data.url
    } catch (err: any) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Abonnement</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold capitalize">Plan {user.plan}</p>
            <p className="text-sm text-slate-500">{user.trialActive ? `Essai jusqu'au ${user.trialEndsAt ? new Date(user.trialEndsAt).toLocaleDateString('fr-FR') : ''}` : user.hasSubscription ? `Actif · ${user.subscriptionStatus}` : 'Plan gratuit'}</p>
          </div>
          <Badge className="capitalize">{user.effectivePlan}</Badge>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-slate-500">Posts/jour</p><p className="font-semibold">{limits.postsPerDay === null ? '∞' : limits.postsPerDay}</p></div>
          <div><p className="text-slate-500">Comptes LinkedIn</p><p className="font-semibold">{limits.linkedinAccounts === null ? '∞' : limits.linkedinAccounts}</p></div>
          <div><p className="text-slate-500">Analytics</p><p className="font-semibold">{limits.analyticsDays} jours</p></div>
          <div><p className="text-slate-500">IA</p><p className="font-semibold">{limits.aiGeneration ? '✅' : '❌'}</p></div>
        </div>
        <Separator />
        <div className="flex gap-2">
          <Link href="/pricing" className="flex-1"><Button variant="outline" className="w-full">Changer de plan</Button></Link>
          {billing.canManageBilling && <Button variant="outline" onClick={openPortal} disabled={loading} className="flex-1">{loading ? '...' : 'Gérer (Stripe)'}</Button>}
        </div>
      </CardContent>
    </Card>
  )
}

function AffiliateTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" />Affiliation</CardTitle>
        <CardDescription>Parrainez et gagnez 20% à vie</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 mb-4">Accédez à votre lien de parrainage, suivez vos conversions.</p>
        <Link href="/affiliate"><Button>Voir mon espace</Button></Link>
      </CardContent>
    </Card>
  )
}
