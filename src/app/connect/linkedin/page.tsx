'use client'

import { useEffect, useState } from 'react'
import { Loader2, Linkedin, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ConnectLinkedInPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/linkedin/auth')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.authUrl) {
          // Rediriger vers LinkedIn OAuth
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
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-12 w-12 bg-[#0A66C2] rounded-lg flex items-center justify-center mx-auto mb-4">
            <Linkedin className="h-6 w-6 text-white" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Connexion à LinkedIn en cours...</p>
          <p className="text-slate-400 text-xs mt-1">Vous allez être redirigé vers LinkedIn</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Impossible de se connecter</h1>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <p className="text-xs text-slate-400 mb-6">
            Pour configurer LinkedIn OAuth, l'administrateur doit définir :
            <br />
            <code className="bg-slate-100 px-1 rounded">LINKEDIN_CLIENT_ID</code> et{' '}
            <code className="bg-slate-100 px-1 rounded">LINKEDIN_CLIENT_SECRET</code>
            <br />
            dans les variables d'environnement Render.
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <a href="/"><Button variant="outline">Retour au dashboard</Button></a>
          <a href="/onboarding"><Button>Reprendre l'onboarding</Button></a>
        </div>
      </div>
    </div>
  )
}
