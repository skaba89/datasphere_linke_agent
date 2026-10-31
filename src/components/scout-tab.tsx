'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Search, Loader2, TrendingUp, Target, Zap, Clock,
  AlertCircle, Sparkles, Rocket, Lightbulb, RefreshCw
} from 'lucide-react'

interface ScoutData {
  trends: Array<{
    topic: string
    why: string
    angle: string
    urgency: string
    postIdea: string
  }>
  opportunities: Array<{
    type: string
    description: string
    action: string
    timing: string
  }>
  contentGaps: Array<{
    gap: string
    suggestion: string
    potential: string
  }>
  hotTopics: string[]
}

const urgencyConfig: Record<string, { color: string; label: string }> = {
  high: { color: 'bg-red-100 text-red-600', label: 'Urgent' },
  medium: { color: 'bg-amber-100 text-amber-600', label: 'Bientôt' },
  low: { color: 'bg-slate-100 text-slate-600', label: 'Quand possible' },
}

const potentialConfig: Record<string, { color: string }> = {
  high: { color: 'bg-emerald-100 text-emerald-600' },
  medium: { color: 'bg-blue-100 text-blue-600' },
  low: { color: 'bg-slate-100 text-slate-600' },
}

export function ScoutTab() {
  const [data, setData] = useState<ScoutData | null>(null)
  const [loading, setLoading] = useState(false)
  const [focus, setFocus] = useState('')

  const handleScout = async () => {
    setLoading(true)
    setData(null)
    try {
      const res = await fetch('/api/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focus: focus || 'général' }),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      setData(d.data)
      toast.success('Analyse terminée !')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Search className="h-7 w-7 text-emerald-600" />
          Mission Scout
        </h1>
        <p className="text-slate-500 mt-1">Identifiez les opportunités et tendances de contenu LinkedIn</p>
      </div>

      {/* Search bar */}
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              value={focus}
              onChange={e => setFocus(e.target.value)}
              placeholder="Focus optionnel (ex: IA, marketing B2B, fintech...)"
              onKeyDown={e => e.key === 'Enter' && handleScout()}
              className="bg-white"
            />
            <Button onClick={handleScout} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Lancer le scan
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            L'IA analyse les tendances LinkedIn actuelles et suggère des opportunités de contenu adaptées à vos sujets.
          </p>
        </CardContent>
      </Card>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {data && (
        <>
          {/* Hot Topics */}
          {data.hotTopics && data.hotTopics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Sujets brûlants maintenant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {data.hotTopics.map((topic, i) => (
                    <Badge key={i} className="bg-amber-100 text-amber-700 hover:bg-amber-100 cursor-default">
                      #{topic}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trends */}
          {data.trends && data.trends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Tendances à exploiter ({data.trends.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.trends.map((trend, i) => {
                  const urgency = urgencyConfig[trend.urgency] || urgencyConfig.low
                  return (
                    <div key={i} className="p-3 border border-slate-200 rounded-lg hover:border-emerald-200 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                          <h4 className="font-semibold text-slate-900">{trend.topic}</h4>
                        </div>
                        <Badge variant="outline" className={`text-xs ${urgency.color}`}>
                          <Clock className="h-3 w-3 mr-1" />{urgency.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2 ml-8">{trend.why}</p>
                      <div className="ml-8 space-y-1">
                        <p className="text-xs"><span className="font-medium text-slate-500">Angle:</span> <span className="text-slate-700">{trend.angle}</span></p>
                        <div className="p-2 bg-emerald-50 rounded text-sm text-slate-700 flex items-start gap-2">
                          <Lightbulb className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>{trend.postIdea}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Opportunities */}
          {data.opportunities && data.opportunities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  Opportunités ({data.opportunities.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.opportunities.map((opp, i) => (
                  <div key={i} className="p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">{opp.type}</Badge>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">{opp.description}</p>
                    <div className="flex items-start gap-2 ml-0">
                      <Rocket className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-600"><span className="font-medium">Action:</span> {opp.action}</p>
                        <p className="text-xs text-slate-500"><span className="font-medium">Timing:</span> {opp.timing}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Content Gaps */}
          {data.contentGaps && data.contentGaps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-purple-600" />
                  Content Gaps — sujets non couverts ({data.contentGaps.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.contentGaps.map((gap, i) => {
                  const potential = potentialConfig[gap.potential] || potentialConfig.low
                  return (
                    <div key={i} className="p-3 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-900">{gap.gap}</p>
                        <Badge variant="outline" className={`text-xs ${potential.color}`}>Potentiel: {gap.potential}</Badge>
                      </div>
                      <p className="text-xs text-slate-600 flex items-start gap-1">
                        <Sparkles className="h-3 w-3 text-purple-400 mt-0.5 flex-shrink-0" />
                        {gap.suggestion}
                      </p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleScout} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />Relancer le scan
            </Button>
            <Button onClick={() => { navigator.clipboard.writeText(JSON.stringify(data, null, 2)); toast.success('Résultats copiés !') }}>
              Copier les résultats
            </Button>
          </div>
        </>
      )}

      {!loading && !data && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-4">
              <Search className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Prêt à scanner ?</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
              Mission Scout analyse les tendances LinkedIn, identifie les opportunités de contenu
              et les gaps concurrentiels. Cliquez sur "Lancer le scan" pour commencer.
            </p>
            <Button onClick={handleScout}>
              <Search className="h-4 w-4 mr-2" />Lancer le scan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
