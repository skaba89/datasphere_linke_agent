'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Bot, Send, Loader2, Sparkles, User, Target, AlertCircle,
  Lightbulb, TrendingUp, Zap, MessageCircle
} from 'lucide-react'

// ============================================================
// AI CRM COPILOT TAB
// Agent IA avec contexte CRM (prospects, clients, messages, posts)
// ============================================================

type Message = { role: 'user' | 'assistant'; content: string; meta?: any }

const SUGGESTED_PROMPTS = [
  { icon: TrendingUp, label: 'Quels prospects dois-je relancer cette semaine ?', prompt: 'Quels prospects dois-je relancer en priorité cette semaine ? Identifie les opportunités chaudes et les risques de perte.' },
  { icon: MessageCircle, label: 'Rédige une séquence de 3 messages pour un prospect "contacted"', prompt: 'Rédige une séquence de 3 messages LinkedIn pour un prospect au stage "contacted" qui n\'a pas répondu. Ton : professionnel, brief, apporteur de valeur.' },
  { icon: Target, label: 'Analyse mon pipeline et suggère 3 actions', prompt: 'Analyse mon pipeline CRM et suggère 3 actions concrètes pour améliorer mon taux de conversion cette semaine.' },
  { icon: Lightbulb, label: 'Quels sujets de posts pour engager mes prospects ?', prompt: 'Sur la base de mes prospects actuels, quels sujets de posts LinkedIn me permettraient de les engager ? Donne 5 idées concrètes avec un angle.' },
  { icon: AlertCircle, label: 'Quels prospects sont à risque de perte ?', prompt: 'Identifie les prospects à risque de perte dans mon pipeline et propose une stratégie de sauvegarde pour chacun.' },
  { icon: Zap, label: 'Optimise ma stratégie de prospection', prompt: 'Quelles sont les faiblesses de ma stratégie de prospection actuelle ? Donne 3 recommandations actionnables.' },
]

export function CrmCopilotTab() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Bonjour ! Je suis votre **CRM Copilot IA**. J'ai accès à votre pipeline prospects, vos clients, vos messages CRM et vos derniers posts publiés.\n\nPosez-moi une question ou choisissez une suggestion ci-dessous :",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [prospects, setProspects] = useState<any[]>([])
  const [contextProspectId, setContextProspectId] = useState<string>('')
  const [showContext, setShowContext] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/prospects')
      .then(r => r.json())
      .then(d => { if (d.success) setProspects(d.data.slice(0, 50)) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (promptText?: string) => {
    const text = (promptText || input).trim()
    if (!text || loading) return

    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/crm-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          contextProspectId: contextProspectId || undefined,
        }),
      })
      const d = await res.json()
      if (!d.success) {
        if (res.status === 403) {
          toast.error(d.error || 'Plan Pro requis pour CRM Copilot')
        } else {
          throw new Error(d.error)
        }
        return
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: d.data.content,
        meta: d.meta,
      }])
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Désolé, une erreur est survenue : ${err.message}`,
      }])
    } finally {
      setLoading(false)
    }
  }

  const renderContent = (content: string) => {
    // Simple markdown-ish rendering: bold, line breaks, lists
    const lines = content.split('\n')
    return lines.map((line, i) => {
      // Bold: **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g)
      const rendered = parts.map((p, j) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return <strong key={j} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>
        }
        return <span key={j}>{p}</span>
      })
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return <div key={i} className="flex gap-2 ml-2"><span className="text-emerald-500">•</span><span>{rendered.slice(1)}</span></div>
      }
      if (line.startsWith('---')) {
        return <hr key={i} className="my-2 border-slate-200" />
      }
      if (line.trim() === '') {
        return <div key={i} className="h-2" />
      }
      return <p key={i} className="leading-relaxed">{rendered}</p>
    })
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Bot className="h-7 w-7 text-emerald-600" />
          CRM Copilot IA
        </h1>
        <p className="text-slate-500 mt-1">
          Agent IA avec contexte complet : prospects, clients, messages et posts
        </p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden min-h-[500px]">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-lg ${msg.role === 'user'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-slate-200 text-slate-800'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1 text-xs text-slate-500">
                    <Sparkles className="h-3 w-3 text-emerald-600" />
                    <span>CRM Copilot</span>
                    {msg.meta?.provider && (
                      <Badge variant="outline" className="text-[9px] h-3.5 py-0">{msg.meta.provider}</Badge>
                    )}
                  </div>
                )}
                <div className={`text-sm whitespace-pre-wrap ${msg.role === 'user' ? '' : 'space-y-0.5'}`}>
                  {msg.role === 'assistant' ? renderContent(msg.content) : msg.content}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 p-3 rounded-lg flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                <span className="text-xs text-slate-500">Analyse de votre CRM...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions (only shown when few messages) */}
        {messages.length <= 1 && !loading && (
          <div className="p-3 border-t bg-white">
            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
              <Lightbulb className="h-3 w-3" /> Suggestions
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SUGGESTED_PROMPTS.map((s, i) => {
                const Icon = s.icon
                return (
                  <button
                    key={i}
                    onClick={() => handleSend(s.prompt)}
                    className="flex items-center gap-2 p-2 text-left rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors text-xs"
                  >
                    <Icon className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="text-slate-700">{s.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Context toggle */}
        {showContext && (
          <div className="p-3 border-t bg-amber-50/30">
            <Label className="text-xs text-slate-600 mb-1.5 block">Contextualiser avec un prospect</Label>
            <select
              value={contextProspectId}
              onChange={e => setContextProspectId(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-xs"
            >
              <option value="">Aucun (contexte global)</option>
              {prospects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.company ? `· ${p.company}` : ''} [{p.stage}]
                </option>
              ))}
            </select>
            {contextProspectId && (
              <p className="text-[10px] text-emerald-600 mt-1">
                ✓ L'IA aura accès à l'historique complet de ce prospect
              </p>
            )}
          </div>
        )}

        {/* Input area */}
        <div className="border-t p-3 bg-white">
          <div className="flex gap-2 items-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-9"
              onClick={() => setShowContext(!showContext)}
            >
              <User className="h-3.5 w-3.5 mr-1" />
              {contextProspectId ? 'Prospect actif' : 'Contexte'}
            </Button>
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Posez votre question sur votre CRM..."
              className="flex-1 resize-none text-sm"
              rows={1}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <Button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
