'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
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
    // En production : rediriger vers LinkedIn OAuth
    // Pour la démo : on simule la connexion
    try {
      // Simulation : enregistrer un compte fictif
      const res = await fetch('/api/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: `urn:li:person:demo-${Date.now()}`,
          displayName: 'Marie Dupont',
          email: 'marie@demo.com',
          headline: 'CEO @ TechStartup',
          accessToken: 'demo-token-' + Date.now(),
          scopes: 'r_liteprofile w_member_social r_organization_social',
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setLinkedinConnected(true)
      toast.success('Compte LinkedIn connecté !')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setConnecting(false)
    }
  }

  const generatePost = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Mon premier post généré par DataSphere',
          content: `🚀 Je teste DataSphere, l'IA qui automatise ma présence LinkedIn.

Mon objectif : publier ${profile.postsPerDay}x/jour sur "${profile.topics}" avec un ton ${profile.tone.toLowerCase()}.

Audience cible : ${profile.targetAudience}.

Suivez-moi pour voir l'évolution de mon engagement sur 30 jours ! 📈

#DataSphere #LinkedInAutomation #AI`,
          hashtags: '#DataSphere #LinkedInAutomation #AI',
          format: 'text',
          angle: 'authenticity',
          targetAudience: profile.targetAudience,
          qualityScore: 8.5,
          optimalTime: '09:00',
          engagementEst: '150-300 likes',
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setGeneratedPost(data.data.content)
      toast.success('Post généré avec succès !')
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Bienvenue sur DataSphere 🎉</h1>
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
                    Mode démo : simulation de connexion (pas d'OAuth réel)
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
