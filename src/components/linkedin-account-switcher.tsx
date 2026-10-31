'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Linkedin, Check, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

interface LinkedInAccount {
  id: string
  displayName: string
  email: string | null
  pictureUrl: string | null
  headline: string | null
  status: string
  lastSyncAt: string | null
}

export function LinkedInAccountSwitcher() {
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/linkedin')
      const data = await res.json()
      if (data.success) {
        setAccounts(data.data)
      }
    } catch (err: any) {
      toast.error('Erreur lors du chargement des comptes LinkedIn')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const handleSwitch = async (accountId: string) => {
    setSwitching(accountId)
    try {
      const res = await fetch('/api/linkedin/active', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success('Compte LinkedIn actif mis à jour')
      await loadAccounts()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSwitching(null)
    }
  }

  const activeAccount = accounts.find((a) => a.status === 'active')
  const otherAccounts = accounts.filter((a) => a.status !== 'active')

  if (loading) {
    return <div className="text-sm text-slate-400">Chargement...</div>
  }

  if (accounts.length === 0) {
    return (
      <div className="text-sm text-slate-500">
        <a href="/connect/linkedin" className="text-emerald-600 hover:underline">
          Connecter un compte LinkedIn →
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Compte actif */}
      {activeAccount && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[#0A66C2] text-white text-xs">
              <Linkedin className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {activeAccount.displayName}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {activeAccount.email || activeAccount.headline || 'Aucun email'}
            </p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            <Check className="h-3 w-3 mr-1" />
            Actif
          </Badge>
        </div>
      )}

      {/* Switcher (si +1 compte) */}
      {otherAccounts.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-700 px-3 py-2"
          >
            <span>{otherAccounts.length} autre(s) compte(s)</span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expanded && (
            <div className="space-y-1 mt-1">
              {otherAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                      <Linkedin className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {acc.displayName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {acc.email || 'Aucun email'}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {acc.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSwitch(acc.id)}
                    disabled={switching === acc.id}
                  >
                    {switching === acc.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      'Activer'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lien pour connecter un nouveau compte */}
      <a
        href="/connect/linkedin"
        className="block text-xs text-[#0A66C2] hover:underline pt-1"
      >
        + Connecter un autre compte LinkedIn
      </a>
    </div>
  )
}
