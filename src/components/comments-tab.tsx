'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  MessageSquare, Plus, Check, X, Edit, Send, Loader2, Sparkles,
  ThumbsUp, ThumbsDown, Meh, RefreshCw, Bot
} from 'lucide-react'

interface CommentReply {
  id: string
  commenterName: string
  commenterText: string
  generatedReply: string
  editedReply: string | null
  status: string
  sentiment: string | null
  createdAt: string
  repliedAt: string | null
}

const sentimentConfig: Record<string, { icon: any; color: string; label: string }> = {
  positive: { icon: ThumbsUp, color: 'text-emerald-600 bg-emerald-50', label: 'Positif' },
  neutral: { icon: Meh, color: 'text-slate-600 bg-slate-50', label: 'Neutre' },
  negative: { icon: ThumbsDown, color: 'text-red-600 bg-red-50', label: 'Négatif' },
}

export function CommentsTab() {
  const [comments, setComments] = useState<CommentReply[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ commenterName: '', commenterText: '', linkedinPostId: '' })
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [runningAutomation, setRunningAutomation] = useState(false)

  const load = () => {
    fetch('/api/comments').then(r => r.json()).then(d => { if (d.success) setComments(d.data) }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleSubmit = async () => {
    if (!form.commenterName || !form.commenterText) { toast.error('Nom et commentaire requis'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      toast.success('Réponse IA générée !')
      setForm({ commenterName: '', commenterText: '', linkedinPostId: '' })
      setShowAdd(false)
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }

  const handleApprove = async (id: string) => {
    try {
      await fetch(`/api/comments/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) })
      toast.success('Réponse approuvée — prête à copier-coller sur LinkedIn')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleReject = async (id: string) => {
    try {
      await fetch(`/api/comments/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'rejected' }) })
      toast.success('Rejeté')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleSaveEdit = async (id: string) => {
    try {
      await fetch(`/api/comments/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ editedReply: editText }) })
      toast.success('Réponse modifiée')
      setEditingId(null)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleRunAutomation = async () => {
    setRunningAutomation(true)
    try {
      const res = await fetch('/api/automation/run', { method: 'POST' })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      toast.success(d.data.comments + ' · ' + d.data.sequences)
      load()
    } catch (e: any) { toast.error(e.message) }
    finally { setRunningAutomation(false) }
  }

  const statusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: any }> = {
      pending: { label: 'En attente', variant: 'outline' },
      approved: { label: 'Approuvé', variant: 'default' },
      rejected: { label: 'Rejeté', variant: 'destructive' },
      edited: { label: 'Modifié', variant: 'secondary' },
      sent: { label: 'Envoyé', variant: 'default' },
    }
    const c = config[status] || config.pending
    return <Badge variant={c.variant}>{c.label}</Badge>
  }

  const pendingCount = comments.filter(c => c.status === 'pending' || c.status === 'edited').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-emerald-600" />
            Réponses aux commentaires
          </h1>
          <p className="text-slate-500 mt-1">L'IA génère des réponses humaines à vos commentaires LinkedIn</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRunAutomation} disabled={runningAutomation}>
            {runningAutomation ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bot className="h-4 w-4 mr-2" />}
            Automatiser
          </Button>
          <Button onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4 mr-2" />Commentaire
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="p-3 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800">
            L'IA répond comme un humain expert : pas de formules robotiques, réponses courtes et naturelles, adaptées au sentiment du commentaire.
            {pendingCount > 0 && <strong> {pendingCount} réponse(s) à valider.</strong>}
          </p>
        </CardContent>
      </Card>

      {/* Add comment form */}
      {showAdd && (
        <Card><CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">Soumettre un commentaire reçu sur LinkedIn</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nom du commentateur *</Label><Input value={form.commenterName} onChange={e => setForm({...form, commenterName: e.target.value})} placeholder="Marie Dupont" /></div>
            <div><Label>URL du post LinkedIn (optionnel)</Label><Input value={form.linkedinPostId} onChange={e => setForm({...form, linkedinPostId: e.target.value})} placeholder="urn:li:..." /></div>
          </div>
          <div><Label>Commentaire *</Label><Textarea value={form.commenterText} onChange={e => setForm({...form, commenterText: e.target.value})} rows={3} placeholder="Super post, ça me parle beaucoup ! J'ai vécu la même chose..." /></div>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Génération IA...</> : <><Sparkles className="h-4 w-4 mr-2" />Générer une réponse</>}
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
          </div>
        </CardContent></Card>
      )}

      {/* Comments list */}
      {loading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div> :
       comments.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-1">Aucun commentaire à traiter</p>
          <p className="text-sm text-slate-400">Soumettez un commentaire reçu ou utilisez l'extension Chrome pour automatiser</p>
        </CardContent></Card>
       ) : (
        <div className="space-y-3">
          {comments.map(comment => {
            const sentiment = comment.sentiment ? sentimentConfig[comment.sentiment] || sentimentConfig.neutral : null
            const SentimentIcon = sentiment?.icon
            const replyToShow = comment.editedReply || comment.generatedReply
            return (
              <Card key={comment.id} className="border-slate-200">
                <CardContent className="p-4">
                  {/* Comment */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
                      {comment.commenterName.split(' ').map(w => w[0]).slice(0,2).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{comment.commenterName}</p>
                        {sentiment && SentimentIcon && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${sentiment.color}`}>
                            <SentimentIcon className="h-3 w-3" />{sentiment.label}
                          </span>
                        )}
                        {statusBadge(comment.status)}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{comment.commenterText}</p>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">{new Date(comment.createdAt).toLocaleDateString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
                  </div>

                  {/* AI Reply */}
                  <div className="ml-11 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <div className="flex items-center gap-1 mb-1">
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      <span className="text-[10px] font-semibold text-emerald-600 uppercase">Réponse IA</span>
                      {comment.editedReply && <span className="text-[10px] text-slate-400">(modifiée)</span>}
                    </div>
                    {editingId === comment.id ? (
                      <div className="space-y-2">
                        <Textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} className="bg-white" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveEdit(comment.id)}>Sauver</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Annuler</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">{replyToShow}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {editingId !== comment.id && (comment.status === 'pending' || comment.status === 'edited') && (
                    <div className="flex gap-2 mt-3 ml-11">
                      <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleApprove(comment.id)}>
                        <Check className="h-3 w-3 mr-1" />Approuver
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(comment.id); setEditText(replyToShow) }}>
                        <Edit className="h-3 w-3 mr-1" />Modifier
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleReject(comment.id)}>
                        <X className="h-3 w-3 mr-1" />Rejeter
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(replyToShow); toast.success('Réponse copiée !') }}>
                        Copier
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
       )}
    </div>
  )
}
