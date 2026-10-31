'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Check, Linkedin, Rocket, User, ArrowRight } from 'lucide-react'

const STEPS = ['Profil', 'LinkedIn', 'Premier post'] as const

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <OnboardingContent />
    </Suspense>
  )
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState({
    topics: 'IA, tech, marketing digital',
    tone: 'Professionnel mais accessible',
    targetAudience: 'entrepreneurs, CTO',
    postsPerDay: 3,
  })
  const [linkedinConnected, setLinkedinConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedPost, setGeneratedPost] = useState<string>('')

  const progress = ((step + 1) / STEPS.length) * 100

  // ⭐ Gestion du retour OAuth LinkedIn (?linkedin=connected ou ?error=XXX)
  useEffect(() => {
    const linkedin = searchParams.get('linkedin')
    const error = searchParams.get('error')

    if (linkedin === 'connected') {
      setLinkedinConnected(true)
      setStep(2) // avancer à l'étape "Premier post"
      toast.success('Compte LinkedIn connecté avec succès !')
      // nettoyer l'URL
      router.replace('/onboarding')
    } else if (error) {
      const errorMessages: Record<string, string> = {
        missing_params: 'Paramètres manquants lors du callback LinkedIn.',
        invalid_state: 'État OAuth invalide. Réessayez.',
        expired_state: 'Session expirée. Réessayez.',
        config_missing: 'Configuration LinkedIn manquante côté serveur.',
        token_exchange_failed: 'Échange du code LinkedIn échoué. Vérifiez vos credentials.',
        profile_fetch_failed: 'Impossible de récupérer votre profil LinkedIn.',
        server_error: 'Erreur serveur. Réessayez plus tard.',
        user_cancelled: 'Vous avez annulé la connexion LinkedIn.',
        unauthorized: 'Vous devez autoriser l\'app LinkedIn.',
      }
      toast.error(errorMessages[error] || `Erreur LinkedIn: ${error}`)
      router.replace('/onboarding')
    }
  }, [searchParams, router])

  // Vérifier si un compte LinkedIn est déjà connecté (au mount)
  useEffect(() => {
    fetch('/api/linkedin')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data && d.data.length > 0) {
          const activeAccount = d.data.find((a: any) => a.status === 'active')
          if (activeAccount) {
            setLinkedinConnected(true)
          }
        }
      })
      .catch(() => {})
  }, [])

  const saveProfile = async () => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: profile.topics,
          tone: profile.tone,
          targetAudience: profile.targetAudience,
          maxPostsPerDay: profile.postsPerDay,
        }),
      })
      setStep(1)
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const connectLinkedIn = async () => {
    setConnecting(true)
    try {
      // 1. Demander l'URL d'autorisation LinkedIn au backend
      const res = await fetch('/api/linkedin/auth')
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      // 2. Rediriger vers LinkedIn OAuth (vraie page LinkedIn)
      window.location.href = data.data.authUrl
    } catch (err: any) {
      toast.error(err.message)
      setConnecting(false)
    }
  }

  const generatePost = async () => {
    setGenerating(true)
    try {
      // ✅ Vraie génération IA via /api/proposals/generate
      const res = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 1 }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setGeneratedPost(data.data[0].content)
      toast.success('Post généré par IA avec succès !')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-3">
            Étape {step + 1} / {STEPS.length}
          </Badge>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Bienvenue sur LinkedInPost 🎉</h1>
          <p className="text-slate-600">Configurez votre compte en moins de 2 minutes.</p>
          <Progress value={progress} className="mt-4" />
        </div>

        {/* STEP 1: PROFILE */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" /> Votre profil
              </CardTitle>
              <CardDescription>
                Ces informations aident l'IA à générer du contenu adapté.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sujets de prédilection</Label>
                <Input
                  value={profile.topics}
                  onChange={(e) => setProfile({ ...profile, topics: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ton éditorial</Label>
                <Input
                  value={profile.tone}
                  onChange={(e) => setProfile({ ...profile, tone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Audience cible</Label>
                <Input
                  value={profile.targetAudience}
                  onChange={(e) => setProfile({ ...profile, targetAudience: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Posts par jour</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={profile.postsPerDay}
                  onChange={(e) => setProfile({ ...profile, postsPerDay: parseInt(e.target.value) || 3 })}
                />
              </div>
              <Button onClick={saveProfile} className="w-full">
                Continuer <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: LINKEDIN */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Linkedin className="w-5 h-5 text-[#0A66C2]" /> Connectez LinkedIn
              </CardTitle>
              <CardDescription>
                Sans connexion LinkedIn, vous pouvez générer du contenu mais pas publier.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {linkedinConnected ? (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">LinkedIn connecté</p>
                    <p className="text-sm text-green-700">Vous pouvez maintenant publier automatiquement.</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-900 mb-4">
                    Nous utilisons l'OAuth officiel de LinkedIn. Vos identifiants ne transitent jamais par nos serveurs.
                    Tokens chiffrés AES-256, révocables à tout moment.
                  </p>
                  <Button
                    onClick={connectLinkedIn}
                    disabled={connecting}
                    className="w-full bg-[#0A66C2] hover:bg-[#0A66C2]/90"
                  >
                    <Linkedin className="w-4 h-4 mr-2" />
                    {connecting ? 'Connexion...' : 'Connecter mon compte LinkedIn'}
                  </Button>
                  <p className="text-xs text-blue-700 mt-3 text-center">
                    Connexion sécurisée via OAuth 2.0 — vos identifiants ne transitent jamais par nos serveurs
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                  Retour
                </Button>
                <Button onClick={() => setStep(2)} className="flex-1">
                  Continuer <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: FIRST POST */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5" /> Votre premier post
              </CardTitle>
              <CardDescription>
                Laissez l'IA générer votre premier post LinkedIn en 1 clic.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!generatedPost ? (
                <Button onClick={generatePost} disabled={generating} className="w-full" size="lg">
                  {generating ? 'Génération en cours...' : '✨ Générer mon premier post'}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-slate-50 border whitespace-pre-wrap text-sm">
                    {generatedPost}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={generatePost} className="flex-1">
                      Régénérer
                    </Button>
                    <Button
                      onClick={() => router.push('/')}
                      className="flex-1"
                    >
                      Accéder au dashboard <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
              <Button variant="ghost" onClick={() => router.push('/')} className="w-full">
                Passer cette étape
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
