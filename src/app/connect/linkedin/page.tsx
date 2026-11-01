'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, Linkedin, AlertCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ConnectLinkedInPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ConnectContent />
    </Suspense>
  )
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="h-12 w-12 bg-[#0A66C2] rounded-lg flex items-center justify-center mx-auto mb-4">
          <Linkedin className="h-6 w-6 text-white" />
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Connexion à LinkedIn...</p>
      </div>
    </div>
  )
}

function ConnectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Vérifier si on revient d'une erreur de callback
    const linkedinError = searchParams.get('linkedin_error')
    const linkedinSuccess = searchParams.get('linkedin')

    if (linkedinSuccess === 'connected') {
      // Succès ! Rediriger vers le dashboard
      router.replace('/')
      return
    }

    if (linkedinError) {
      const errorMessages: Record<string, string> = {
        missing_params: 'Paramètres manquants lors du callback LinkedIn.',
        invalid_state: 'Session expirée. Réessayez.',
        config_missing: 'LinkedIn n\'est pas configuré sur le serveur. Contactez l\'administrateur.',
        token_exchange_failed: 'L\'échange du code LinkedIn a échoué. Vérifiez les credentials.',
        profile_failed: 'Impossible de récupérer votre profil LinkedIn.',
        server_error: 'Erreur serveur. Réessayez plus tard.',
      }
      setError(errorMessages[linkedinError] || `Erreur: ${linkedinError}`)
      setLoading(false)
      return
    }

    // Sinon, démarrer le flux OAuth
    fetch('/api/linkedin/auth')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.authUrl) {
          window.location.href = data.data.authUrl
        } else {
          setError(data.error || 'Configuration LinkedIn manquante')
          setLoading(false)
        }
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [searchParams, router])

  if (loading) return <Loading />

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Connexion LinkedIn impossible</h1>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left mb-6">
            <p className="text-xs font-semibold text-slate-700 mb-2">📋 Pour configurer LinkedIn :</p>
            <ol className="text-xs text-slate-500 space-y-1 list-decimal pl-4">
              <li>Créez une app sur <span className="text-blue-600">linkedin.com/developers/apps</span></li>
              <li>Ajoutez les produits : <strong>Sign In with LinkedIn</strong> + <strong>Share on LinkedIn</strong></li>
              <li>URL de redirection : <code className="bg-white px-1 rounded text-[10px]">https://datasphere-sq19.onrender.com/api/linkedin/callback</code></li>
              <li>Copiez <strong>Client ID</strong> et <strong>Client Secret</strong></li>
              <li>Ajoutez-les dans Render → Environment → <code className="bg-white px-1 rounded text-[10px]">LINKEDIN_CLIENT_ID</code> et <code className="bg-white px-1 rounded text-[10px]">LINKEDIN_CLIENT_SECRET</code></li>
            </ol>
          </div>
        </div>
        <div className="flex gap-2 justify-center">
          <Link href="/"><Button variant="outline">Retour au dashboard</Button></Link>
          <Link href="/connect/linkedin"><Button>Réessayer</Button></Link>
        </div>
      </div>
    </div>
  )
}
