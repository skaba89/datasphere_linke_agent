'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, X, Loader2, AlertCircle, Copy, ExternalLink, Rocket } from 'lucide-react'
import { toast } from 'sonner'

interface HealthData {
  status: string
  database: { status: string; migrations?: string; migrationError?: string }
  envVars: Record<string, any>
  integrations: Record<string, any>
  responseTimeMs: number
  uptime: string
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-red-500" />
}

export default function SetupPage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkHealth = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      setHealth(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { checkHealth() }, [])

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copié')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <nav className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Rocket className="h-6 w-6 text-emerald-600" />
            Setup Guide
          </div>
          <Button variant="outline" size="sm" onClick={checkHealth} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Recheck'}
          </Button>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900">Erreur de connexion</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Status global
              {health && (
                <Badge variant={health.status === 'ok' ? 'default' : 'destructive'}>
                  {health.status.toUpperCase()}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : health ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <StatusIcon ok={health.database?.status === 'ok'} />
                  <span>Database : {health.database?.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon ok={health.database?.migrations === 'OK'} />
                  <span>Migrations : {health.database?.migrations}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon ok={health.envVars?.DATABASE_URL} />
                  <span>DATABASE_URL</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon ok={health.envVars?.DATASPHERE_AUTH_SECRET} />
                  <span>AUTH_SECRET</span>
                </div>
                <div>Response: {health.responseTimeMs}ms</div>
                <div>Uptime: {health.uptime}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📋 Étapes de déploiement Render (Free Plan)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Step number={1} title="Connecter le repo GitHub à Render">
              <p>Allez sur <a href="https://dashboard.render.com" target="_blank" className="text-emerald-600 hover:underline inline-flex items-center gap-1">Render Dashboard <ExternalLink className="h-3 w-3" /></a> → New → Blueprint</p>
              <p>Sélectionnez le repo <code className="bg-slate-100 px-1 rounded">skaba89/datasphere_linke_agent</code></p>
              <p>Render détecte <code className="bg-slate-100 px-1 rounded">render.yaml</code> et crée automatiquement :</p>
              <ul className="list-disc pl-5 space-y-1 ml-2">
                <li>1 web service <code className="bg-slate-100 px-1 rounded">datasphere</code> (Docker, free plan)</li>
                <li>1 PostgreSQL <code className="bg-slate-100 px-1 rounded">datasphere-db</code> (free, 1GB)</li>
              </ul>
            </Step>

            <Step number={2} title="Vérifier les variables d'environnement auto">
              <p>Ces variables sont automatiquement injectées par Render :</p>
              <ul className="list-disc pl-5 space-y-1 ml-2">
                <li><code className="bg-slate-100 px-1 rounded">DATABASE_URL</code> : depuis PostgreSQL</li>
                <li><code className="bg-slate-100 px-1 rounded">DATASPHERE_AUTH_SECRET</code> : auto-généré</li>
                <li><code className="bg-slate-100 px-1 rounded">NEXT_PUBLIC_APP_URL</code> : votre URL Render</li>
                <li><code className="bg-slate-100 px-1 rounded">CRON_SECRET</code> : auto-généré</li>
              </ul>
            </Step>

            <Step number={3} title="Attendre le 1er déploiement (~5 min)">
              <p>Render build l'image Docker, applique les migrations, démarre le serveur.</p>
              <p>Surveillez les logs Render jusqu'à voir : <code className="bg-emerald-100 px-1 rounded">✓ Ready</code></p>
              <p className="text-amber-600">⚠️ Le 1er déploiement peut prendre 5-10 min (build Docker + npm install)</p>
            </Step>

            <Step number={4} title="Tester le health check">
              <p>Vérifiez que le service démarre correctement :</p>
              <div className="flex items-center gap-2 my-2">
                <code className="flex-1 bg-slate-100 px-2 py-1 rounded text-xs">curl https://VOTRE-APP.onrender.com/api/health</code>
                <Button size="sm" variant="ghost" onClick={() => copyText('curl https://VOTRE-APP.onrender.com/api/health')}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p>Doit retourner <code className="bg-emerald-100 px-1 rounded">status: ok</code> avec <code className="bg-emerald-100 px-1 rounded">database.migrations: OK</code></p>
            </Step>

            <Step number={5} title="Configurer LinkedIn OAuth (optionnel)" optional>
              <p>1. Créez une app sur <a href="https://www.linkedin.com/developers/apps" target="_blank" className="text-emerald-600 hover:underline inline-flex items-center gap-1">LinkedIn Developers <ExternalLink className="h-3 w-3" /></a></p>
              <p>2. Ajoutez les produits : <strong>Sign In with LinkedIn</strong> + <strong>Share on LinkedIn</strong></p>
              <p>3. Redirect URI : <code className="bg-slate-100 px-1 rounded">https://VOTRE-APP.onrender.com/api/linkedin/callback</code></p>
              <p>4. Dans Render dashboard → Environment, ajoutez :</p>
              <ul className="list-disc pl-5 space-y-1 ml-2">
                <li><code className="bg-slate-100 px-1 rounded">LINKEDIN_CLIENT_ID</code></li>
                <li><code className="bg-slate-100 px-1 rounded">LINKEDIN_CLIENT_SECRET</code></li>
                <li><code className="bg-slate-100 px-1 rounded">LINKEDIN_REDIRECT_URI</code></li>
              </ul>
            </Step>

            <Step number={6} title="Configurer Stripe (optionnel)" optional>
              <p>1. Créez un compte sur <a href="https://dashboard.stripe.com" target="_blank" className="text-emerald-600 hover:underline inline-flex items-center gap-1">Stripe <ExternalLink className="h-3 w-3" /></a></p>
              <p>2. Créez 2 produits : Pro 29€/mois, Business 79€/mois → récupérez les Price IDs</p>
              <p>3. Webhook endpoint : <code className="bg-slate-100 px-1 rounded">https://VOTRE-APP.onrender.com/api/stripe/webhook</code></p>
              <p>4. Dans Render, ajoutez :</p>
              <ul className="list-disc pl-5 space-y-1 ml-2">
                <li><code className="bg-slate-100 px-1 rounded">STRIPE_SECRET_KEY</code></li>
                <li><code className="bg-slate-100 px-1 rounded">STRIPE_WEBHOOK_SECRET</code></li>
                <li><code className="bg-slate-100 px-1 rounded">STRIPE_PRICE_PRO_MONTHLY</code></li>
                <li><code className="bg-slate-100 px-1 rounded">STRIPE_PRICE_BUSINESS_MONTHLY</code></li>
              </ul>
            </Step>

            <Step number={7} title="Configurer les crons (cron-job.org)" optional>
              <p>⚠️ Le plan free Render ne supporte pas les crons. Utilisez <a href="https://cron-job.org" target="_blank" className="text-emerald-600 hover:underline inline-flex items-center gap-1">cron-job.org <ExternalLink className="h-3 w-3" /></a> (gratuit) :</p>
              <p>Créez 4 jobs avec le header <code className="bg-slate-100 px-1 rounded">Authorization: Bearer VOTRE_CRON_SECRET</code> :</p>
              <ul className="list-disc pl-5 space-y-1 ml-2">
                <li>Sync analytics : <code className="bg-slate-100 px-1 rounded">/api/cron/sync-analytics</code> (toutes les heures)</li>
                <li>Auto-publish : <code className="bg-slate-100 px-1 rounded">/api/cron/scheduled-publish</code> (toutes les 30min)</li>
                <li>Onboarding emails : <code className="bg-slate-100 px-1 rounded">/api/cron/onboarding-emails</code> (quotidien 9h)</li>
                <li>Payouts : <code className="bg-slate-100 px-1 rounded">/api/cron/payouts</code> (1er du mois)</li>
              </ul>
            </Step>
          </CardContent>
        </Card>

        {health && (
          <Card>
            <CardHeader>
              <CardTitle>🔧 Diagnostics détaillés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-medium mb-2">Database</p>
                <pre className="bg-slate-100 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(health.database, null, 2)}
                </pre>
              </div>
              <div>
                <p className="font-medium mb-2">Env vars</p>
                <pre className="bg-slate-100 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(health.envVars, null, 2)}
                </pre>
              </div>
              <div>
                <p className="font-medium mb-2">Integrations</p>
                <pre className="bg-slate-100 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(health.integrations, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">← Accueil</Button>
          </Link>
          <Link href="/register" className="flex-1">
            <Button className="w-full">Créer un compte</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}

function Step({ number, title, children, optional }: { number: number; title: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <div className="border-l-2 border-emerald-200 pl-4 py-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
          {number}
        </span>
        <h4 className="font-semibold text-slate-900">{title}</h4>
        {optional && <Badge variant="outline" className="text-xs">Optionnel</Badge>}
      </div>
      <div className="text-slate-600 space-y-1 ml-8">
        {children}
      </div>
    </div>
  )
}
