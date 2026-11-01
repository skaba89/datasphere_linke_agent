'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Bot, Plus, Trash2, Loader2, CheckCircle2, Circle, Clock,
  AlertCircle, Brain, Target, Lightbulb, Zap, ListTodo
} from 'lucide-react'

// ============================================================
// AI AGENT WORKSPACE TAB
// Tasks + long-term memory for the AI agent
// ============================================================

type Task = {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  priority: string
  output: string | null
  agentNotes: string | null
  dueAt: string | null
  completedAt: string | null
  createdAt: string
}

type MemoryEntry = {
  id: string
  key: string
  value: string
  category: string
  updatedAt: string
}

const STATUS_META: Record<string, { label: string; icon: any; color: string }> = {
  todo: { label: 'À faire', icon: Circle, color: 'text-slate-500' },
  in_progress: { label: 'En cours', icon: Clock, color: 'text-blue-600' },
  done: { label: 'Terminé', icon: CheckCircle2, color: 'text-emerald-600' },
  blocked: { label: 'Bloqué', icon: AlertCircle, color: 'text-red-500' },
}

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  high: { label: 'Haute', color: 'bg-red-100 text-red-700' },
  medium: { label: 'Moyenne', color: 'bg-amber-100 text-amber-700' },
  low: { label: 'Basse', color: 'bg-slate-100 text-slate-700' },
}

const TYPE_LABELS: Record<string, string> = {
  custom: 'Personnalisé',
  generate_post: 'Génération post',
  analyze_profile: 'Analyse profil',
  reach_out: 'Contact prospect',
  follow_up: 'Relance',
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  general: { label: 'Général', icon: Brain, color: 'text-slate-600' },
  preference: { label: 'Préférence', icon: Lightbulb, color: 'text-amber-600' },
  fact: { label: 'Fait', icon: Target, color: 'text-blue-600' },
  goal: { label: 'Objectif', icon: Zap, color: 'text-emerald-600' },
}

export function AgentWorkspaceTab() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [memory, setMemory] = useState<MemoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showAddMemory, setShowAddMemory] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', description: '', type: 'custom', priority: 'medium', dueAt: '' })
  const [memoryForm, setMemoryForm] = useState({ key: '', value: '', category: 'general' })
  const [savingTask, setSavingTask] = useState(false)
  const [savingMemory, setSavingMemory] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  const load = () => {
    Promise.all([
      fetch('/api/agent-workspace/tasks').then(r => r.json()),
      fetch('/api/agent-workspace/memory').then(r => r.json()),
    ]).then(([t, m]) => {
      if (t.success) setTasks(t.data)
      if (m.success) setMemory(m.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAddTask = async () => {
    if (taskForm.title.trim().length < 3) {
      toast.error('Titre trop court (3 caractères min.)')
      return
    }
    setSavingTask(true)
    try {
      const res = await fetch('/api/agent-workspace/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description || undefined,
          type: taskForm.type,
          priority: taskForm.priority,
          dueAt: taskForm.dueAt || undefined,
        }),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      toast.success('Tâche créée')
      setTaskForm({ title: '', description: '', type: 'custom', priority: 'medium', dueAt: '' })
      setShowAddTask(false)
      load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingTask(false)
    }
  }

  const handleAddMemory = async () => {
    if (!memoryForm.key.trim() || !memoryForm.value.trim()) {
      toast.error('Clé et valeur requises')
      return
    }
    setSavingMemory(true)
    try {
      const res = await fetch('/api/agent-workspace/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memoryForm),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      toast.success('Mémoire enregistrée')
      setMemoryForm({ key: '', value: '', category: 'general' })
      setShowAddMemory(false)
      load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingMemory(false)
    }
  }

  const handleUpdateTaskStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/agent-workspace/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Supprimer cette tâche ?')) return
    try {
      await fetch(`/api/agent-workspace/tasks/${id}`, { method: 'DELETE' })
      toast.success('Supprimé')
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDeleteMemory = async (key: string) => {
    if (!confirm(`Supprimer la mémoire "${key}" ?`)) return
    try {
      await fetch(`/api/agent-workspace/memory/${encodeURIComponent(key)}`, { method: 'DELETE' })
      toast.success('Supprimé')
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  const stats = {
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-80" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Bot className="h-7 w-7 text-emerald-600" />
          AI Agent Workspace
        </h1>
        <p className="text-slate-500 mt-1">
          Gérez les tâches de votre agent IA et sa mémoire à long terme
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* TASKS — col span 2 */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListTodo className="h-5 w-5 text-emerald-600" />
                    Tâches ({tasks.length})
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {stats.todo} à faire · {stats.in_progress} en cours · {stats.done} terminées · {stats.blocked} bloquées
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowAddTask(!showAddTask)}>
                  <Plus className="h-4 w-4 mr-1" />Nouvelle
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Filter buttons */}
              <div className="flex gap-1 flex-wrap">
                {[
                  { key: 'all', label: 'Toutes' },
                  { key: 'todo', label: 'À faire' },
                  { key: 'in_progress', label: 'En cours' },
                  { key: 'done', label: 'Terminées' },
                  { key: 'blocked', label: 'Bloquées' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      filter === f.key
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {showAddTask && (
                <div className="p-3 border border-slate-200 rounded-lg space-y-2 bg-slate-50/50">
                  <Input
                    placeholder="Titre de la tâche *"
                    value={taskForm.title}
                    onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  />
                  <Textarea
                    placeholder="Description (optionnel)"
                    value={taskForm.description}
                    onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                    rows={2}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={taskForm.type}
                      onChange={e => setTaskForm({ ...taskForm, type: e.target.value })}
                      className="px-2 py-1.5 rounded-md border border-slate-200 text-xs"
                    >
                      {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <select
                      value={taskForm.priority}
                      onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                      className="px-2 py-1.5 rounded-md border border-slate-200 text-xs"
                    >
                      <option value="low">Basse</option>
                      <option value="medium">Moyenne</option>
                      <option value="high">Haute</option>
                    </select>
                    <Input
                      type="date"
                      value={taskForm.dueAt}
                      onChange={e => setTaskForm({ ...taskForm, dueAt: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddTask} disabled={savingTask}>
                      {savingTask ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                      Créer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddTask(false)}>Annuler</Button>
                  </div>
                </div>
              )}

              {filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <ListTodo className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Aucune tâche dans cette catégorie</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTasks.map(t => {
                    const statusMeta = STATUS_META[t.status] || STATUS_META.todo
                    const StatusIcon = statusMeta.icon
                    const priorityMeta = PRIORITY_META[t.priority] || PRIORITY_META.medium
                    return (
                      <div key={t.id} className={`p-3 rounded-lg border ${
                        t.status === 'done' ? 'bg-emerald-50/30 border-emerald-100' :
                        t.status === 'blocked' ? 'bg-red-50/30 border-red-100' :
                        'border-slate-200'
                      }`}>
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => {
                              const next = t.status === 'todo' ? 'in_progress' : t.status === 'in_progress' ? 'done' : 'todo'
                              handleUpdateTaskStatus(t.id, next)
                            }}
                            className="mt-0.5"
                          >
                            <StatusIcon className={`h-5 w-5 ${statusMeta.color}`} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${t.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                              {t.title}
                            </p>
                            {t.description && (
                              <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <Badge variant="outline" className="text-[9px]">{TYPE_LABELS[t.type] || t.type}</Badge>
                              <Badge variant="outline" className={`text-[9px] ${priorityMeta.color}`}>{priorityMeta.label}</Badge>
                              <Badge variant="outline" className={`text-[9px] ${statusMeta.color} border-current/30`}>
                                {statusMeta.label}
                              </Badge>
                              {t.dueAt && (
                                <span className="text-[10px] text-slate-400">
                                  <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                                  {new Date(t.dueAt).toLocaleDateString('fr-FR')}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:bg-red-50 flex-shrink-0"
                            onClick={() => handleDeleteTask(t.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* MEMORY — col span 1 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    Mémoire IA
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {memory.length} entrée(s)
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowAddMemory(!showAddMemory)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {showAddMemory && (
                <div className="p-3 border border-slate-200 rounded-lg space-y-2 bg-slate-50/50">
                  <Input
                    placeholder="Clé (ex: ton_prefere)"
                    value={memoryForm.key}
                    onChange={e => setMemoryForm({ ...memoryForm, key: e.target.value })}
                    className="text-xs"
                  />
                  <Textarea
                    placeholder="Valeur"
                    value={memoryForm.value}
                    onChange={e => setMemoryForm({ ...memoryForm, value: e.target.value })}
                    rows={2}
                    className="text-xs"
                  />
                  <select
                    value={memoryForm.category}
                    onChange={e => setMemoryForm({ ...memoryForm, category: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-xs"
                  >
                    {Object.entries(CATEGORY_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button size="sm" className="text-xs" onClick={handleAddMemory} disabled={savingMemory}>
                      {savingMemory ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                      Enregistrer
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowAddMemory(false)}>Annuler</Button>
                  </div>
                </div>
              )}

              {memory.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <Brain className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Aucune mémoire enregistrée</p>
                  <p className="text-[10px] mt-1">L'agent IA utilisera cette mémoire pour personnaliser ses réponses</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {memory.map(m => {
                    const catMeta = CATEGORY_META[m.category] || CATEGORY_META.general
                    const CatIcon = catMeta.icon
                    return (
                      <div key={m.id} className="p-2 rounded-lg border border-slate-100">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <CatIcon className={`h-3 w-3 ${catMeta.color}`} />
                            <span className="text-xs font-semibold text-slate-700">{m.key}</span>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 text-red-400 hover:bg-red-50"
                            onClick={() => handleDeleteMemory(m.key)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap">{m.value}</p>
                        <p className="text-[9px] text-slate-400 mt-1">
                          {catMeta.label} · MAJ {new Date(m.updatedAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">ℹ️ Comment ça marche</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-2">
              <p><strong>Tâches</strong> : planifiez des actions pour votre agent IA (génération de posts, analyses, relances).</p>
              <p><strong>Mémoire</strong> : l'agent IA conserve des informations à long terme (ton préféré, objectifs, faits sur votre audience) pour personnaliser ses réponses.</p>
              <Separator className="my-2" />
              <p className="text-[11px] text-slate-500">
                💡 Astuce : ajoutez des préférences comme "ton_prefere", "audience_cible", "sujets_eviter" pour guider l'IA.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
