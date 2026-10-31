'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Crown, UserPlus, Trash2, Mail, ArrowLeft, Users } from 'lucide-react'

interface Member {
  id: string
  userId: string
  role: string
  joinedAt: string
  user: { id: string; email: string; name: string | null }
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  expiresAt: string
  createdAt: string
}

interface Team {
  id: string
  name: string
  ownerId: string
  plan: string
  createdAt: string
  members: Member[]
  pendingInvitations: Invitation[]
}

export default function TeamPage() {
  const router = useRouter()
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviting, setInviting] = useState(false)

  const loadTeam = async () => {
    try {
      const res = await fetch('/api/teams')
      const data = await res.json()
      if (data.success) {
        setTeam(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTeam()
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    try {
      const res = await fetch('/api/teams/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success(data.data.message)
      setInviteEmail('')
      await loadTeam()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (memberUserId: string, email: string) => {
    if (!confirm(`Retirer ${email} de l'équipe ?`)) return
    try {
      const res = await fetch(`/api/teams/members/${memberUserId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success('Membre retiré')
      await loadTeam()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleRevokeInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Annuler l'invitation de ${email} ?`)) return
    try {
      const res = await fetch(`/api/teams/invitations/${invitationId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success('Invitation annulée')
      await loadTeam()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const getInitials = (name: string | null, email: string) => {
    const src = name || email
    return src.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    )
  }

  // Pas de team : proposer de la créer (si plan Business)
  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6 text-purple-600" />
              Équipes
            </CardTitle>
            <CardDescription>
              La fonctionnalité Équipes est disponible avec le plan Business.
              Invitez jusqu'à 5 membres, partagez vos comptes LinkedIn et collaborez.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              onClick={() => router.push('/pricing')}
            >
              Passer au plan Business
            </Button>
            <Link href="/" className="block text-center text-sm text-slate-600 hover:underline">
              ← Retour au dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isOwnerOrAdmin = team.members.find(
    (m) => m.userId === team.ownerId || m.role === 'admin'
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white">
        <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm">DS</span>
            LinkedInPost
          </Link>
          <Link href="/" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="h-8 w-8 text-purple-600" />
            {team.name}
          </h1>
          <p className="text-slate-500 mt-1">
            {team.members.length} / 5 sièges utilisés · Plan Business
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Membres */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Membres ({team.members.length})</CardTitle>
                <CardDescription>Membres actuels de l'équipe</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {team.members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50"
                  >
                    <Avatar>
                      <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                        {getInitials(m.user.name, m.user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {m.user.name || m.user.email}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{m.user.email}</p>
                    </div>
                    <Badge variant={m.role === 'owner' ? 'default' : m.role === 'admin' ? 'secondary' : 'outline'}>
                      {m.role === 'owner' && <Crown className="h-3 w-3 mr-1" />}
                      {m.role}
                    </Badge>
                    {m.role !== 'owner' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                        onClick={() => handleRemoveMember(m.userId, m.user.email)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Invitations pending */}
            {team.pendingInvitations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Invitations en attente ({team.pendingInvitations.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {team.pendingInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-amber-100 bg-amber-50"
                    >
                      <Mail className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{inv.email}</p>
                        <p className="text-xs text-slate-500">
                          {inv.role} · Expire le {new Date(inv.expiresAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:bg-red-100"
                        onClick={() => handleRevokeInvitation(inv.id, inv.email)}
                      >
                        Annuler
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar : inviter */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Inviter un membre
                </CardTitle>
                <CardDescription>
                  {team.members.length >= 5
                    ? 'Limite de 5 sièges atteinte'
                    : `${5 - team.members.length} siège(s) restant(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {team.members.length >= 5 ? (
                  <p className="text-sm text-slate-500">
                    Retirez un membre pour inviter une nouvelle personne.
                  </p>
                ) : (
                  <form onSubmit={handleInvite} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="collegue@entreprise.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Rôle</Label>
                      <select
                        id="role"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                        className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm"
                      >
                        <option value="member">Membre (peut publier)</option>
                        <option value="admin">Admin (peut inviter/retirer)</option>
                      </select>
                    </div>
                    <Button type="submit" disabled={inviting} className="w-full">
                      {inviting ? 'Envoi...' : 'Envoyer l\'invitation'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">ℹ️ Comment ça marche</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 space-y-2">
                <p>1. L'invité reçoit un email avec un lien d'acceptation.</p>
                <p>2. S'il n'a pas de compte, il devra s'inscrire avec le même email.</p>
                <p>3. Une fois acceptée, il a accès aux comptes LinkedIn partagés de l'équipe.</p>
                <p>4. Les owners/admins peuvent retirer des membres à tout moment.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
