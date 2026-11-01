'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Sparkles, Wand2, Copy, Check, Loader2, Plus, Trash2,
  TrendingUp, Target, MessageSquare, CheckCircle2, AlertCircle,
  BarChart3, Lightbulb, RefreshCw, FileText, Zap, Clock, Cpu
} from 'lucide-react'

// ============================================================
// AI PERSONAL BRAND STUDIO TAB
// ============================================================
type VoiceProfile = {
  tone?: string
  style?: string
  vocabulary?: string[]
  structure?: string
  emoji?: string
  ctStyle?: string
}

type BrandResult = {
  voiceProfile?: VoiceProfile
  strengths?: string[]
  improvements?: string[]
  contentPillars?: string[]
  samplePost?: string
  raw?: string
}

export function BrandStudioTab() {
  const [samples, setSamples] = useState<string[]>(['', '', ''])
  const [domain, setDomain] = useState('')
  const [audience, setAudience] = useState('')
  const [goals, setGoals] = useState('')
  const [result, setResult] = useState<BrandResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const updateSample = (i: number, val: string) => {
    setSamples(prev => prev.map((s, idx) => (idx === i ? val : s)))
  }

  const addSample = () => setSamples(prev => [...prev, ''])
  const removeSample = (i: number) => setSamples(prev => prev.filter((_, idx) => idx !== i))

  const handleAnalyze = async () => {
    const validSamples = samples.filter(s => s.trim().length >= 50)
    if (validSamples.length === 0) {
      toast.error('Ajoutez au moins un exemple de post (50 caractères min.)')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/brand-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samples: validSamples, domain, audience, goals }),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      setResult(d.data)
      setProvider(d.provider)
      toast.success('Profil éditorial généré')
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const copySample = () => {
    if (!result?.samplePost) return
    navigator.clipboard.writeText(result.samplePost)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-emerald-600" />
          Personal Brand Studio
        </h1>
        <p className="text-slate-500 mt-1">
          L'IA analyse votre style éditorial et crée votre voix de marque unique
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* INPUT */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-emerald-600" />
              Vos exemples de contenu
            </CardTitle>
            <CardDescription>
              Collez 1 à 5 posts LinkedIn que vous avez écrits. Plus il y en a, plus l'analyse sera précise.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {samples.map((s, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-500">Post {i + 1}</Label>
                  {samples.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeSample(i)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Textarea
                  value={s}
                  onChange={e => updateSample(i, e.target.value)}
                  placeholder="Collez ici un de vos posts LinkedIn..."
                  rows={4}
                  className="resize-none text-sm"
                />
                <p className="text-[10px] text-slate-400">{s.length} caractères</p>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addSample} className="w-full">
              <Plus className="h-3 w-3 mr-1" /> Ajouter un exemple
            </Button>

            <Separator className="my-3" />

            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Domaine d'expertise</Label>
                <Input
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  placeholder="Ex: Marketing B2B SaaS"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Audience cible</Label>
                <Input
                  value={audience}
                  onChange={e => setAudience(e.target.value)}
                  placeholder="Ex: CEOs, CMOs, fondateurs de startups"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Objectifs</Label>
                <Input
                  value={goals}
                  onChange={e => setGoals(e.target.value)}
                  placeholder="Ex: Générer des leads, construire une autorité"
                  className="text-sm"
                />
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyse en cours...</>
              ) : (
                <><Wand2 className="h-4 w-4 mr-2" /> Analyser mon style</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* OUTPUT */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-emerald-600" />
              Profil éditorial
            </CardTitle>
            <CardDescription>
              {result ? `Généré par ${provider || 'IA'}` : 'Lancez l\'analyse pour voir votre profil'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!result && !loading && (
              <div className="text-center py-12 text-slate-400">
                <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Votre voix éditoriale apparaîtra ici</p>
              </div>
            )}
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" />
                ))}
              </div>
            )}
            {result?.raw && (
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{result.raw}</div>
            )}
            {result?.voiceProfile && (
              <>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-slate-500">Voix</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-slate-500">Ton:</span> {result.voiceProfile.tone}</div>
                    <div><span className="text-slate-500">Style:</span> {result.voiceProfile.style}</div>
                    <div><span className="text-slate-500">Émojis:</span> {result.voiceProfile.emoji}</div>
                    <div><span className="text-slate-500">CTA:</span> {result.voiceProfile.ctStyle}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-500">Structure type:</span> {result.voiceProfile.structure}
                  </div>
                  {result.voiceProfile.vocabulary && result.voiceProfile.vocabulary.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {result.voiceProfile.vocabulary.map((v, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{v}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            {result?.strengths && result.strengths.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Points forts
                </h4>
                <ul className="space-y-1">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-slate-700 flex gap-2">
                      <span className="text-emerald-500">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result?.improvements && result.improvements.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-amber-500" /> Axes d'amélioration
                </h4>
                <ul className="space-y-1">
                  {result.improvements.map((s, i) => (
                    <li key={i} className="text-sm text-slate-700 flex gap-2">
                      <span className="text-amber-500">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result?.contentPillars && result.contentPillars.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3 text-blue-500" /> Piliers éditoriaux
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {result.contentPillars.map((p, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-blue-50">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
            {result?.samplePost && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-slate-500">Post exemple</h4>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={copySample}>
                    {copied ? <><Check className="h-3 w-3 mr-1" /> Copié</> : <><Copy className="h-3 w-3 mr-1" /> Copier</>}
                  </Button>
                </div>
                <div className="bg-slate-50 border rounded-lg p-3 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {result.samplePost}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// CONTENT QUALITY STUDIO TAB
// ============================================================
type QualityScore = {
  overall?: number
  hook?: number
  structure?: number
  readability?: number
  cta?: number
  hashtag?: number
}

type QualityAnalysis = {
  hook?: string
  structure?: string
  readability?: string
  cta?: string
  length?: string
  hashtag?: string
}

type QualityResult = {
  score?: QualityScore
  analysis?: QualityAnalysis
  suggestions?: string[]
  revisedVersion?: string
  abVariant?: string
  raw?: string
}

export function ContentQualityTab() {
  const [content, setContent] = useState('')
  const [result, setResult] = useState<QualityResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState<string | null>(null)
  const [copied, setCopied] = useState<'revised' | 'ab' | null>(null)

  const handleAnalyze = async () => {
    if (content.trim().length < 10) {
      toast.error('Contenu trop court (10 caractères min.)')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/content-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      setResult(d.data)
      setProvider(d.provider)
      toast.success('Analyse terminée')
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const copy = (which: 'revised' | 'ab', text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 2000)
  }

  const scoreColor = (s: number | undefined) => {
    if (s === undefined) return 'text-slate-400'
    if (s >= 8) return 'text-emerald-600'
    if (s >= 6) return 'text-amber-500'
    return 'text-red-500'
  }
  const scoreBg = (s: number | undefined) => {
    if (s === undefined) return ''
    if (s >= 8) return 'bg-emerald-500'
    if (s >= 6) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-emerald-600" />
          Content Quality Studio
        </h1>
        <p className="text-slate-500 mt-1">
          Analyse IA de vos posts : score, suggestions et variantes A/B
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* INPUT */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              Votre post
            </CardTitle>
            <CardDescription>
              Collez un brouillon de post LinkedIn pour l'analyser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Collez votre post LinkedIn ici..."
              rows={10}
              className="resize-none text-sm"
            />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{content.length} caractères</span>
              <span className={content.length >= 800 && content.length <= 1500 ? 'text-emerald-600' : ''}>
                Idéal: 800-1500
              </span>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={loading || content.trim().length < 10}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyse...</>
              ) : (
                <><Wand2 className="h-4 w-4 mr-2" /> Analyser la qualité</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* OUTPUT */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Résultat
            </CardTitle>
            <CardDescription>
              {result ? `Généré par ${provider || 'IA'}` : 'L\'analyse apparaîtra ici'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!result && !loading && (
              <div className="text-center py-12 text-slate-400">
                <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Le score et les suggestions apparaîtront ici</p>
              </div>
            )}
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-4 bg-slate-100 animate-pulse rounded" />
                ))}
              </div>
            )}
            {result?.raw && (
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{result.raw}</div>
            )}
            {result?.score && (
              <div className="space-y-3">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className={`text-4xl font-bold ${scoreColor(result.score.overall)}`}>
                    {result.score.overall?.toFixed(1)}/10
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Score global</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {(['hook', 'structure', 'readability', 'cta', 'hashtag'] as const).map(k => {
                    const v = result.score?.[k]
                    return (
                      <div key={k} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="capitalize text-xs text-slate-500">{k}</span>
                          <span className={`text-xs font-semibold ${scoreColor(v)}`}>{v ?? '-'}/10</span>
                        </div>
                        <Progress value={(v ?? 0) * 10} className={`h-1.5 ${scoreBg(v)}`} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {result?.analysis && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase text-slate-500">Analyse détaillée</h4>
                <div className="text-sm text-slate-700 space-y-1">
                  {result.analysis.hook && <p><span className="text-slate-500">Accroche:</span> {result.analysis.hook}</p>}
                  {result.analysis.structure && <p><span className="text-slate-500">Structure:</span> {result.analysis.structure}</p>}
                  {result.analysis.readability && <p><span className="text-slate-500">Lisibilité:</span> {result.analysis.readability}</p>}
                  {result.analysis.length && <p><span className="text-slate-500">Longueur:</span> {result.analysis.length}</p>}
                  {result.analysis.cta && <p><span className="text-slate-500">CTA:</span> {result.analysis.cta}</p>}
                  {result.analysis.hashtag && <p><span className="text-slate-500">Hashtags:</span> {result.analysis.hashtag}</p>}
                </div>
              </div>
            )}
            {result?.suggestions && result.suggestions.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase text-slate-500">Suggestions</h4>
                <ul className="space-y-1">
                  {result.suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-slate-700 flex gap-2">
                      <span className="text-emerald-500">→</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result?.revisedVersion && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" /> Version révisée
                  </h4>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => copy('revised', result.revisedVersion!)}>
                    {copied === 'revised' ? <><Check className="h-3 w-3 mr-1" /> Copié</> : <><Copy className="h-3 w-3 mr-1" /> Copier</>}
                  </Button>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {result.revisedVersion}
                </div>
              </div>
            )}
            {result?.abVariant && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Variante A/B
                  </h4>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => copy('ab', result.abVariant!)}>
                    {copied === 'ab' ? <><Check className="h-3 w-3 mr-1" /> Copié</> : <><Copy className="h-3 w-3 mr-1" /> Copier</>}
                  </Button>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {result.abVariant}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// MULTI-IA COMPARISON TAB
// Compare responses from all configured AI providers in parallel
// ============================================================
type CompareResult = {
  provider: string
  content: string | null
  latencyMs: number
  error?: string
}

const PROVIDER_META: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  gemini: { label: 'Gemini', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', emoji: '🔵' },
  glm: { label: 'GLM (Z.ai)', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', emoji: '🟣' },
  groq: { label: 'Groq (Llama)', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', emoji: '🟠' },
  openrouter: { label: 'OpenRouter', color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200', emoji: '🩷' },
  'zai-sdk': { label: 'z-ai SDK', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', emoji: '🟢' },
}

export function MultiAICompareTab() {
  const [prompt, setPrompt] = useState('')
  const [system, setSystem] = useState('')
  const [results, setResults] = useState<CompareResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedProvider, setCopiedProvider] = useState<string | null>(null)

  const handleCompare = async () => {
    if (prompt.trim().length < 5) {
      toast.error('Prompt trop court (5 caractères min.)')
      return
    }
    setLoading(true)
    setResults(null)
    try {
      const res = await fetch('/api/ai/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          system: system || undefined,
          temperature: 0.7,
          maxTokens: 800,
        }),
      })
      const d = await res.json()
      if (!d.success) {
        if (res.status === 403) {
          toast.error(d.error || 'Plan Pro requis pour Multi-IA Comparison')
        } else {
          throw new Error(d.error)
        }
        return
      }
      setResults(d.data)
      const successCount = d.data.filter((r: CompareResult) => r.content).length
      toast.success(`${successCount}/${d.data.length} providers ont répondu`)
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (provider: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedProvider(provider)
    setTimeout(() => setCopiedProvider(null), 2000)
  }

  const sortedResults = results
    ? [...results].sort((a, b) => {
        // Errors last, then sort by latency (fastest first)
        if (a.error && !b.error) return 1
        if (!a.error && b.error) return -1
        return a.latencyMs - b.latencyMs
      })
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Cpu className="h-7 w-7 text-emerald-600" />
          Multi-IA Comparison
        </h1>
        <p className="text-slate-500 mt-1">
          Comparez les réponses de tous les providers IA configurés en parallèle
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-5 w-5 text-emerald-600" />
            Prompt de test
          </CardTitle>
          <CardDescription>
            Le même prompt sera envoyé simultanément à Gemini, GLM, Groq, OpenRouter et z-ai SDK.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-slate-500">System prompt (optionnel)</Label>
            <Input
              value={system}
              onChange={e => setSystem(e.target.value)}
              placeholder="Ex: Tu es un expert LinkedIn. Réponds en français, format court."
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Prompt *</Label>
            <Textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ex: Rédige une accroche LinkedIn percutante sur le thème de l'entrepreneuriat."
              rows={4}
              className="resize-none text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">{prompt.length}/4000 caractères</p>
          </div>
          <Button
            onClick={handleCompare}
            disabled={loading || prompt.trim().length < 5}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Comparaison en cours...</>
            ) : (
              <><Zap className="h-4 w-4 mr-2" /> Lancer la comparaison</>
            )}
          </Button>
        </CardContent>
      </Card>

      {sortedResults && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Résultats ({sortedResults.length} providers)
            </h3>
            <Badge variant="outline" className="text-xs">
              {sortedResults.filter(r => r.content).length} réussis · {sortedResults.filter(r => r.error).length} échecs
            </Badge>
          </div>
          <div className="grid gap-3">
            {sortedResults.map((r, i) => {
              const meta = PROVIDER_META[r.provider] || { label: r.provider, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', emoji: '⚪' }
              const isWinner = i === 0 && r.content
              return (
                <Card key={r.provider} className={`overflow-hidden ${meta.bg} ${isWinner ? 'ring-2 ring-emerald-400' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span>{meta.emoji}</span>
                        <span className={meta.color}>{meta.label}</span>
                        {isWinner && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300">
                            🏆 Plus rapide
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {(r.latencyMs / 1000).toFixed(2)}s
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {r.error ? (
                      <div className="flex items-start gap-2 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Échec</p>
                          <p className="text-xs text-red-500/80">{r.error}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-sm text-slate-700 whitespace-pre-wrap bg-white/60 rounded p-2 max-h-72 overflow-y-auto">
                          {r.content}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-500">{r.content?.length} caractères</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => handleCopy(r.provider, r.content || '')}
                          >
                            {copiedProvider === r.provider ? (
                              <><Check className="h-3 w-3 mr-1" /> Copié</>
                            ) : (
                              <><Copy className="h-3 w-3 mr-1" /> Copier</>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
