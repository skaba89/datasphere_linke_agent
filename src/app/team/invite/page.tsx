'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Users, Check, AlertCircle } from 'lucide-react'

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <AcceptInvitationContent />
    </Suspense>
  )
}

function AcceptInvitationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Token manquant dans l\'URL')
      setLoading(false)
      return
    }

    fetch(`/api/teams/accept/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          setError(data.error)
        } else {
          setInvitation(data.data)
        }
      })
      .catch(() => setError('Erreur réseau'))
      .finally(() => setLoading(false))
  }, [token])

  const handleAccept = async () => {
    if (!token) return
    setAccepting(true)
    try {
      const res = await fetch(`/api/teams/accept/${token}`, { method: 'POST' })
      const data = await res.json()
      if (!data.success) {
        // Si non authentifié, rediriger vers /register avec redirect
        if (res.status === 401) {
          toast.info('Créez un compte avec cet email pour accepter l\'invitation.')
          router.push(`/register?redirect=team/invite%3Ftoken%3D${token}`)
          return
        }
        throw new Error(data.error)
      }
      toast.success(data.message || 'Invitation acceptée !')
      router.push('/team')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <p>Chargement de l'invitation...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <CardTitle>Invitation invalide</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/">
              <Button variant="outline">Retour à l'accueil</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mb-3">
            <Users className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Vous êtes invité !</CardTitle>
          <CardDescription>
            Rejoignez l'équipe <strong>"{invitation?.teamName}"</strong> sur DataSphere
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Équipe :</span>
              <span className="font-medium">{invitation?.teamName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Rôle :</span>
              <span className="font-medium capitalize">{invitation?.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email invité :</span>
              <span className="font-medium">{invitation?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Expire le :</span>
              <span className="font-medium">
                {invitation?.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString('fr-FR') : ''}
              </span>
            </div>
          </div>

          <Button onClick={handleAccept} disabled={accepting} className="w-full" size="lg">
            {accepting ? 'Acceptation...' : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Accepter l'invitation
              </>
            )}
          </Button>

          <p className="text-xs text-slate-500 text-center">
            En acceptant, vous rejoignez cette équipe et partagez ses accès LinkedIn.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
