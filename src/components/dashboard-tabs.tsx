'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Calendar, FileCode, ScrollText, FileBarChart, Bot, User,
  Target, Filter, Mail, Network, Search, Plus, Send, Loader2,
  ChevronLeft, ChevronRight, Check, X, Sparkles, TrendingUp,
  MessageSquare
} from 'lucide-react'
import { POST_TEMPLATES, getIndustries } from '@/lib/templates'

// Note: AI calls are done via API routes, not direct import (client-side safe)

// ============================================================
// CALENDRIER TAB
// ============================================================
export function CalendarTab() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    fetch('/api/proposals')
      .then(r => r.json())
      .then(d => { if (d.success) setPosts(d.data) })
      .finally(() => setLoading(false))
  }, [])

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()
  const monthName = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const getPostsForDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return posts.filter(p => {
      const postDate = p.publishedAt || p.scheduledFor || p.createdAt
      return new Date(postDate).toISOString().split('T')[0] === dateStr
    })
  }

  if (loading) return <Skeleton className="h-96 w-full" />

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="h-7 w-7 text-emerald-600" />
            Calendrier
          </h1>
          <p className="text-slate-500 mt-1">Planifiez et visualisez vos publications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm min-w-[140px] text-center capitalize">{monthName}</span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: (firstDay === 0 ? 6 : firstDay - 1) }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayPosts = getPostsForDay(day)
              const isToday = new Date().toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString()
              return (
                <div key={day} className={`aspect-square border rounded-lg p-1 overflow-hidden ${isToday ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100'}`}>
                  <p className={`text-xs ${isToday ? 'font-bold text-emerald-600' : 'text-slate-400'}`}>{day}</p>
                  <div className="space-y-0.5 mt-0.5">
                    {dayPosts.slice(0, 2).map(p => (
                      <div key={p.id} className={`text-[9px] px-1 py-0.5 rounded truncate ${
                        p.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                        p.status === 'failed' ? 'bg-red-100 text-red-700' :
                        p.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {p.title}
                      </div>
                    ))}
                    {dayPosts.length > 2 && <p className="text-[9px] text-slate-400">+{dayPosts.length - 2}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// TEMPLATES IA TAB
// ============================================================
export function TemplatesTab() {
  const [industry, setIndustry] = useState<string>('all')
  const [applying, setApplying] = useState<string | null>(null)
  const industries = getIndustries()
  const filtered = industry === 'all' ? POST_TEMPLATES : POST_TEMPLATES.filter(t => t.industry === industry)

  const handleApply = async (template: any) => {
    setApplying(template.id)
    try {
      // Save the template settings to user's SmartPosterSettings
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: template.topics,
          tone: template.tone,
          targetAudience: template.targetAudience,
        }),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      toast.success(`Template "${template.name}" appliqué ! Vos paramètres sont mis à jour.`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setApplying(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <FileCode className="h-7 w-7 text-emerald-600" />
          Templates IA
        </h1>
        <p className="text-slate-500 mt-1">Bibliothèque de templates de posts par industrie</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={industry === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIndustry('all')}
        >
          Tous ({POST_TEMPLATES.length})
        </Button>
        {industries.map(ind => {
          const count = POST_TEMPLATES.filter(t => t.industry === ind).length
          return (
            <Button
              key={ind}
              variant={industry === ind ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIndustry(ind)}
            >
              {ind} ({count})
            </Button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(template => (
          <Card key={template.id} className="border-slate-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className="text-xs">{template.industry}</Badge>
                <Badge variant="secondary" className="text-xs capitalize">{template.angle}</Badge>
              </div>
              <CardTitle className="text-base">{template.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-600">{template.description}</p>
              <div className="space-y-1 text-xs text-slate-500">
                <p><span className="font-medium">Topics:</span> {template.topics}</p>
                <p><span className="font-medium">Ton:</span> {template.tone}</p>
                <p><span className="font-medium">Audience:</span> {template.targetAudience}</p>
              </div>
              <p className="text-xs text-slate-400 italic">Ex: "{template.exampleTitle}"</p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => handleApply(template)}
                disabled={applying === template.id}
              >
                {applying === template.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Appliquer ce template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// LOGS TAB
// ============================================================
export function LogsTab() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notifications?limit=50')
      .then(r => r.json())
      .then(d => { if (d.success) setLogs(d.data) })
      .finally(() => setLoading(false))
  }, [])

  const typeColors: Record<string, string> = {
    info: 'bg-blue-100 text-blue-600',
    success: 'bg-emerald-100 text-emerald-600',
    warning: 'bg-amber-100 text-amber-600',
    error: 'bg-red-100 text-red-600',
    billing: 'bg-purple-100 text-purple-600',
    team: 'bg-indigo-100 text-indigo-600',
    linkedin: 'bg-sky-100 text-sky-600',
    ai: 'bg-pink-100 text-pink-600',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <ScrollText className="h-7 w-7 text-emerald-600" />
          Logs
        </h1>
        <p className="text-slate-500 mt-1">Historique des actions et événements</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <ScrollText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucun log pour le moment</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map(log => (
                <div key={log.id} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${typeColors[log.type] || typeColors.info}`}>
                    <ScrollText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{log.title}</p>
                    <p className="text-xs text-slate-500 truncate">{log.message}</p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {new Date(log.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// RAPPORTS TAB
// ============================================================
export function ReportsTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton className="h-96 w-full" />
  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <FileBarChart className="h-7 w-7 text-emerald-600" />
          Rapports
        </h1>
        <p className="text-slate-500 mt-1">Rapports de performance détaillés par client</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Total clients</p><p className="text-xl font-bold">{data.stats.activeClients}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Total posts</p><p className="text-xl font-bold">{data.stats.totalPosts}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Publiés ce mois</p><p className="text-xl font-bold">{data.stats.publishedThisMonth}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Taux publication</p><p className="text-xl font-bold">{data.stats.publicationRate}%</p></CardContent></Card>
      </div>

      {/* Per-client reports */}
      {data.clientPerformance.map((client: any) => (
        <Card key={client.id} className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: client.color }} />
              {client.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center mb-4">
              <div><p className="text-2xl font-bold text-slate-900">{client.totalPosts}</p><p className="text-xs text-slate-500">Posts totaux</p></div>
              <div><p className="text-2xl font-bold text-amber-600">{client.pending}</p><p className="text-xs text-slate-500">En attente</p></div>
              <div><p className="text-2xl font-bold text-emerald-600">{client.publishedThisMonth}</p><p className="text-xs text-slate-500">Ce mois</p></div>
              <div><p className="text-2xl font-bold text-slate-900">{client.monthlyGoal}</p><p className="text-xs text-slate-500">Objectif</p></div>
              <div><p className="text-2xl font-bold text-blue-600">{client.goalProgress}%</p><p className="text-xs text-slate-500">Progression</p></div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${client.goalProgress}%`, backgroundColor: client.color }} />
            </div>
          </CardContent>
        </Card>
      ))}

      {data.clientPerformance.length === 0 && (
        <Card><CardContent className="py-12 text-center"><p className="text-slate-400">Aucun client. Ajoutez-en depuis le Dashboard.</p></CardContent></Card>
      )}
    </div>
  )
}

// ============================================================
// AGENT IA TAB (chat avec IA)
// ============================================================
export function AgentIATab() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: "Bonjour ! Je suis votre Agent IA LinkedInPost. Je peux vous aider à :\n\n• Générer des idées de posts\n• Optimiser votre profil LinkedIn\n• Analyser votre stratégie de contenu\n• Proposer des accroches percutantes\n\nQue puis-je faire pour vous ?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      setMessages(prev => [...prev, { role: 'assistant', content: d.data.content }])
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Désolé, une erreur est survenue: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Bot className="h-7 w-7 text-emerald-600" />
          Agent IA
        </h1>
        <p className="text-slate-500 mt-1">Votre assistant IA pour LinkedIn</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 p-3 rounded-lg"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
            </div>
          )}
        </div>
        <div className="border-t p-3 flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Posez votre question..."
            className="flex-1 resize-none"
            rows={1}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  )
}

// ============================================================
// PROFILE OPTIMIZATION TAB
// ============================================================
export function ProfileTab() {
  const [headline, setHeadline] = useState('')
  const [about, setAbout] = useState('')
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleAnalyze = async () => {
    if (!headline && !about) { toast.error('Remplissez au moins un champ'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/ai/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline, about }),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      setAnalysis(d.data.content)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <User className="h-7 w-7 text-emerald-600" />
          Optimisation profil
        </h1>
        <p className="text-slate-500 mt-1">Analysez et optimisez votre profil LinkedIn avec l'IA</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Votre profil actuel</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Titre (headline)</Label>
            <Input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="ex: CEO @ TechStartup | IA & Marketing B2B" />
          </div>
          <div className="space-y-2">
            <Label>À propos (summary)</Label>
            <Textarea value={about} onChange={e => setAbout(e.target.value)} placeholder="Collez votre section 'À propos' LinkedIn..." rows={5} />
          </div>
          <Button onClick={handleAnalyze} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Analyser avec l'IA
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Recommandations IA</CardTitle></CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{analysis}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================
// GENERIC COMING SOON TAB (for Mission Scout only now)
// ============================================================
export function ComingSoonTab({ title, description, icon: Icon }: { title: string; description: string; icon: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Icon className="h-7 w-7 text-emerald-600" />
          {title}
        </h1>
        <p className="text-slate-500 mt-1">{description}</p>
      </div>
      <Card className="border-slate-200">
        <CardContent className="py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-4">
            <Icon className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">{description}</p>
          <Badge variant="secondary" className="bg-amber-100 text-amber-700">Bientôt disponible</Badge>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// PROSPECTING TAB - Gérer et ajouter des prospects
// ============================================================
export function ProspectingTab() {
  const [prospects, setProspects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', company: '', title: '', email: '', linkedinUrl: '', notes: '' })

  const load = () => {
    fetch('/api/prospects').then(r => r.json()).then(d => { if (d.success) setProspects(d.data) }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Nom requis'); return }
    try {
      const res = await fetch('/api/prospects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      toast.success('Prospect ajouté !')
      setForm({ name: '', company: '', title: '', email: '', linkedinUrl: '', notes: '' })
      setShowAdd(false)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce prospect ?')) return
    try {
      await fetch(`/api/prospects/${id}`, { method: 'DELETE' })
      toast.success('Supprimé')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const stageColors: Record<string, string> = {
    new: 'bg-slate-100 text-slate-600',
    contacted: 'bg-blue-100 text-blue-600',
    replied: 'bg-amber-100 text-amber-600',
    meeting: 'bg-purple-100 text-purple-600',
    won: 'bg-emerald-100 text-emerald-600',
    lost: 'bg-red-100 text-red-600',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="h-7 w-7 text-emerald-600" />
            Prospecting
          </h1>
          <p className="text-slate-500 mt-1">Trouvez et gérez vos prospects LinkedIn</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}><Plus className="h-4 w-4 mr-2" />Ajouter</Button>
      </div>

      {showAdd && (
        <Card><CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Jean Dupont" /></div>
            <div><Label>Entreprise</Label><Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="TechCorp" /></div>
            <div><Label>Titre</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="CTO" /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="jean@techcorp.com" /></div>
          </div>
          <div><Label>URL LinkedIn</Label><Input value={form.linkedinUrl} onChange={e => setForm({...form, linkedinUrl: e.target.value})} placeholder="https://linkedin.com/in/..." /></div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
          <div className="flex gap-2"><Button onClick={handleAdd}>Créer</Button><Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button></div>
        </CardContent></Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div> :
           prospects.length === 0 ? <div className="text-center py-12"><Target className="h-12 w-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Aucun prospect. Cliquez sur "Ajouter".</p></div> :
           <div className="divide-y divide-slate-100">
             {prospects.map(p => (
               <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                 <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600 flex-shrink-0">
                   {p.name.split(' ').map(w => w[0]).slice(0,2).join('')}
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-medium text-slate-900">{p.name}</p>
                   <p className="text-xs text-slate-500">{p.title ? `${p.title} · ` : ''}{p.company || 'Sans entreprise'}</p>
                 </div>
                 <Badge variant="outline" className={`text-xs capitalize ${stageColors[p.stage] || ''}`}>{p.stage}</Badge>
                 <Button size="icon" variant="ghost" className="text-red-500 h-8 w-8" onClick={() => handleDelete(p.id)}><X className="h-4 w-4" /></Button>
               </div>
             ))}
           </div>}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// PIPELINE TAB - Vue funnel des prospects
// ============================================================
export function PipelineTab() {
  const [prospects, setProspects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/prospects').then(r => r.json()).then(d => { if (d.success) setProspects(d.data) }).finally(() => setLoading(false))
  }, [])

  const stages = [
    { id: 'new', label: 'Nouveau', color: 'bg-slate-100' },
    { id: 'contacted', label: 'Contacté', color: 'bg-blue-50' },
    { id: 'replied', label: 'A répondu', color: 'bg-amber-50' },
    { id: 'meeting', label: 'Meeting', color: 'bg-purple-50' },
    { id: 'won', label: 'Gagné', color: 'bg-emerald-50' },
    { id: 'lost', label: 'Perdu', color: 'bg-red-50' },
  ]

  const handleDrop = async (stage: string) => {
    if (!draggingId) return
    try {
      await fetch(`/api/prospects/${draggingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }) })
      setProspects(prev => prev.map(p => p.id === draggingId ? { ...p, stage } : p))
      setDraggingId(null)
      toast.success(`Prospect déplacé vers "${stage}"`)
    } catch (e: any) { toast.error(e.message) }
  }

  if (loading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Filter className="h-7 w-7 text-emerald-600" />
          Pipeline Prospects
        </h1>
        <p className="text-slate-500 mt-1">Glissez-déposez vos prospects dans le funnel</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
        {stages.map(stage => {
          const stageProspects = prospects.filter(p => p.stage === stage.id)
          return (
            <div
              key={stage.id}
              className={`${stage.color} rounded-lg p-3 min-h-[200px]`}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(stage.id)}
            >
              <p className="text-xs font-semibold text-slate-600 uppercase mb-2">{stage.label} ({stageProspects.length})</p>
              <div className="space-y-2">
                {stageProspects.map(p => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setDraggingId(p.id)}
                    className="bg-white rounded-md p-2 shadow-sm cursor-move hover:shadow-md transition-shadow"
                  >
                    <p className="text-xs font-medium text-slate-900 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{p.company || '—'}</p>
                  </div>
                ))}
                {stageProspects.length === 0 && <p className="text-[10px] text-slate-400 text-center py-4">Vide</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// CRM SÉQUENCES TAB
// ============================================================
export function CrmTab() {
  const [sequences, setSequences] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })

  const load = () => {
    fetch('/api/sequences').then(r => r.json()).then(d => { if (d.success) setSequences(d.data) }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Nom requis'); return }
    try {
      const res = await fetch('/api/sequences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, steps: [{ day: 1, subject: 'Bonjour', body: 'Message de première contact...' }] }) })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      toast.success('Séquence créée !')
      setForm({ name: '', description: '' })
      setShowAdd(false)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="h-7 w-7 text-emerald-600" />
            CRM Séquences
          </h1>
          <p className="text-slate-500 mt-1">Automatisez vos séquences de messages</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}><Plus className="h-4 w-4 mr-2" />Nouvelle séquence</Button>
      </div>

      {showAdd && (
        <Card><CardContent className="p-4 space-y-3">
          <div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Séquence de bienvenue" /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} placeholder="Séquence pour nouveaux prospects..." /></div>
          <div className="flex gap-2"><Button onClick={handleAdd}>Créer</Button><Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button></div>
        </CardContent></Card>
      )}

      {loading ? <Skeleton className="h-48 w-full" /> :
       sequences.length === 0 ? <Card><CardContent className="py-12 text-center"><Mail className="h-12 w-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Aucune séquence. Créez-en une pour automatiser vos messages.</p></CardContent></Card> :
       <div className="space-y-3">
         {sequences.map(seq => (
           <Card key={seq.id} className="border-slate-200">
             <CardContent className="p-4">
               <div className="flex items-center justify-between mb-2">
                 <h4 className="font-semibold text-slate-900">{seq.name}</h4>
                 <Badge variant={seq.active ? 'default' : 'outline'}>{seq.active ? 'Active' : 'Inactive'}</Badge>
               </div>
               {seq.description && <p className="text-sm text-slate-500 mb-2">{seq.description}</p>}
               <p className="text-xs text-slate-400">{Array.isArray(seq.steps) ? `${seq.steps.length} étape(s)` : 'Aucune étape'}</p>
             </CardContent>
           </Card>
         ))}
       </div>}
    </div>
  )
}

// ============================================================
// NETWORKING TAB
// ============================================================
export function NetworkingTab() {
  const [prospects, setProspects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/prospects').then(r => r.json()).then(d => { if (d.success) setProspects(d.data) }).finally(() => setLoading(false))
  }, [])

  const stats = {
    total: prospects.length,
    contacted: prospects.filter(p => p.stage !== 'new').length,
    replied: prospects.filter(p => ['replied','meeting','won'].includes(p.stage)).length,
    won: prospects.filter(p => p.stage === 'won').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Network className="h-7 w-7 text-emerald-600" />
          Networking
        </h1>
        <p className="text-slate-500 mt-1">Développez votre réseau LinkedIn</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><Network className="h-6 w-6 text-blue-500 mb-1" /><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-slate-500">Contacts</p></CardContent></Card>
        <Card><CardContent className="p-4"><Mail className="h-6 w-6 text-amber-500 mb-1" /><p className="text-2xl font-bold">{stats.contacted}</p><p className="text-xs text-slate-500">Contactés</p></CardContent></Card>
        <Card><CardContent className="p-4"><MessageSquare className="h-6 w-6 text-purple-500 mb-1" /><p className="text-2xl font-bold">{stats.replied}</p><p className="text-xs text-slate-500">Ont répondu</p></CardContent></Card>
        <Card><CardContent className="p-4"><Check className="h-6 w-6 text-emerald-500 mb-1" /><p className="text-2xl font-bold">{stats.won}</p><p className="text-xs text-slate-500">Conquis</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Votre réseau</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-32 w-full" /> :
           prospects.length === 0 ? <div className="text-center py-8"><Network className="h-10 w-10 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-400">Aucun contact. Ajoutez des prospects depuis l'onglet Prospecting.</p></div> :
           <div className="space-y-2">
             {prospects.map(p => (
               <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                 <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
                   {p.name.split(' ').map(w => w[0]).slice(0,2).join('')}
                 </div>
                 <div className="flex-1"><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-slate-500">{p.company || '—'}</p></div>
                 <Badge variant="outline" className="text-xs capitalize">{p.stage}</Badge>
               </div>
             ))}
           </div>}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// MESSAGES TAB
// ============================================================
export function MessagesTab() {
  const [prospects, setProspects] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [selectedProspect, setSelectedProspect] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState({ subject: '', body: '' })

  useEffect(() => {
    fetch('/api/prospects').then(r => r.json()).then(d => { if (d.success) setProspects(d.data) }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedProspect) {
      fetch(`/api/crm-messages?prospectId=${selectedProspect}`).then(r => r.json()).then(d => { if (d.success) setMessages(d.data) })
    }
  }, [selectedProspect])

  const handleSend = async () => {
    if (!selectedProspect || !newMessage.subject || !newMessage.body) return
    try {
      const res = await fetch('/api/crm-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId: selectedProspect, subject: newMessage.subject, body: newMessage.body, status: 'sent' }),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      toast.success('Message envoyé !')
      setNewMessage({ subject: '', body: '' })
      setMessages(prev => [d.data, ...prev])
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="h-7 w-7 text-emerald-600" />
          Messages
        </h1>
        <p className="text-slate-500 mt-1">Gérez vos conversations avec vos prospects</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Prospect list */}
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="text-sm">Prospects</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? <Skeleton className="h-32" /> :
             prospects.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Aucun prospect</p> :
             <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
               {prospects.map(p => (
                 <button key={p.id} onClick={() => setSelectedProspect(p.id)} className={`w-full flex items-center gap-2 p-2 hover:bg-slate-50 ${selectedProspect === p.id ? 'bg-emerald-50' : ''}`}>
                   <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold">{p.name.split(' ').map(w => w[0]).slice(0,2).join('')}</div>
                   <span className="text-sm truncate">{p.name}</span>
                 </button>
               ))}
             </div>}
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-sm">{selectedProspect ? 'Conversation' : 'Sélectionnez un prospect'}</CardTitle></CardHeader>
          <CardContent>
            {!selectedProspect ? <p className="text-sm text-slate-400 text-center py-8">Choisissez un prospect à gauche</p> :
             <div className="space-y-3">
               <div className="space-y-2 max-h-64 overflow-y-auto">
                 {messages.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Aucun message</p> :
                  messages.map(m => (
                    <div key={m.id} className={`p-2 rounded-lg ${m.status === 'sent' ? 'bg-emerald-50 ml-8' : 'bg-slate-100 mr-8'}`}>
                      <p className="text-xs font-semibold text-slate-700">{m.subject}</p>
                      <p className="text-xs text-slate-600 mt-1">{m.body}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{m.sentAt ? new Date(m.sentAt).toLocaleString('fr-FR') : 'Brouillon'}</p>
                    </div>
                  ))}
               </div>
               <div className="space-y-2 border-t pt-3">
                 <Input placeholder="Sujet" value={newMessage.subject} onChange={e => setNewMessage({...newMessage, subject: e.target.value})} />
                 <Textarea placeholder="Message..." value={newMessage.body} onChange={e => setNewMessage({...newMessage, body: e.target.value})} rows={2} />
                 <Button size="sm" onClick={handleSend} disabled={!newMessage.subject || !newMessage.body}><Send className="h-3 w-3 mr-1" />Envoyer</Button>
               </div>
             </div>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
