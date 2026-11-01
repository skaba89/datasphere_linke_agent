'use client'

import Link from 'next/link'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, LayoutDashboard, FileText, BarChart3, Settings,
  ArrowRight, Check, Zap, Clock, Target, RefreshCw, Cog,
  ChevronLeft, ChevronRight, Menu, X, Star, TrendingUp,
  Users, Eye, ThumbsUp, MessageCircle, Share2, MousePointerClick,
  LogOut, Bell, Mail, Trash2, Shield, Crown, Plus, Minus,
  Send, Globe, Play, ChevronDown, ExternalLink, Layers,
  Bot, BarChart as BarChartIcon, Calendar, UserCheck, Rocket, Heart,
  MousePointer, Activity, User, Network, Search, FileCode, ScrollText,
  FileBarChart, Filter, MessageSquare, Zap as ZapIcon,
  Wand2, Gauge, Cpu, DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LinkedInAccountSwitcher } from '@/components/linkedin-account-switcher'
import { NotificationBell } from '@/components/notification-bell'
import { ThemeToggle } from '@/components/theme-toggle'
import { AgencyDashboard } from '@/components/agency-dashboard'
import { CalendarTab, TemplatesTab, LogsTab, ReportsTab, AgentIATab, ProfileTab, ComingSoonTab, ProspectingTab, PipelineTab, CrmTab, NetworkingTab, MessagesTab } from '@/components/dashboard-tabs'
import { CommentsTab } from '@/components/comments-tab'
import { ScoutTab } from '@/components/scout-tab'
import { BrandStudioTab, ContentQualityTab, MultiAICompareTab } from '@/components/brand-studio-tabs'
import { PerformanceIntelligenceTab } from '@/components/performance-intelligence-tab'
import { AgencyCommandCenterTab } from '@/components/agency-command-center-tab'
import { CrmCopilotTab } from '@/components/crm-copilot-tab'
import { RevenueAttributionTab } from '@/components/revenue-attribution-tab'
import { toast } from 'sonner'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line, BarChart, Bar, Legend
} from 'recharts'

// ============================================================
// TYPES
// ============================================================
interface Settings {
  id: string
  maxPostsPerDay: number
  enabled: boolean
  scheduleHourStart: number
  scheduleHourEnd: number
  timezone: string
  autoApprove: boolean
  topics: string
  tone: string
  language: string
  targetAudience: string
}

interface CurrentUser {
  id: string
  email: string
  name: string | null
  role: string
  plan: string
  trialEndsAt: string | null
  trialActive: boolean
  createdAt: string
}

interface Proposal {
  id: string
  title: string
  content: string
  hashtags: string
  format: string
  angle: string
  targetAudience: string
  qualityScore: number
  optimalTime: string
  status: string
  engagementEst: string
  createdAt: string
}

interface Metric {
  id: string
  date: string
  likes: number
  comments: number
  shares: number
  views: number
  clicks: number
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function Home() {
  const [activeTab, setActiveTab] = useState('overview')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [proposalFilter, setProposalFilter] = useState('all')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [linkedinConnected, setLinkedinConnected] = useState(false)
  const [linkedinName, setLinkedinName] = useState<string | null>(null)

  // ============================================================
  // FETCH FUNCTIONS
  // ============================================================
  const [dataLoaded, setDataLoaded] = useState(false)

  // Au mount : vérifier si l'utilisateur est connecté
  // Si non connecté → redirect vers /login (pas de landing page)
  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (d.success && d.data) {
          setUser(d.data)
          // Vérifier le statut LinkedIn en parallèle
          fetch('/api/linkedin')
            .then(r => r.json())
            .then(lk => {
              if (lk.success && lk.data && lk.data.length > 0) {
                const active = lk.data.find((a: any) => a.status === 'active')
                if (active) {
                  setLinkedinConnected(true)
                  setLinkedinName(active.displayName)
                }
              }
            })
            .catch(() => {})
          // Charger les données du dashboard en parallèle
          Promise.all([
            fetch('/api/settings').then(r => r.json()).catch(() => ({ success: false })),
            fetch('/api/proposals').then(r => r.json()).catch(() => ({ success: false })),
            fetch('/api/metrics').then(r => r.json()).catch(() => ({ success: false })),
          ]).then(([s, p, m]) => {
            if (cancelled) return
            if (s.success) setSettings(s.data)
            if (p.success) setProposals(p.data)
            if (m.success) setMetrics(m.data)
            setDataLoaded(true)
          })
        } else {
          // Non authentifié → redirect login
          window.location.href = '/login'
        }
      })
      .catch(() => {
        if (!cancelled) window.location.href = '/login'
      })
      .finally(() => { if (!cancelled) setAuthChecked(true) })
    return () => { cancelled = true }
  }, [])

  const loadDashboardData = useCallback(async () => {
    const [settingsRes, proposalsRes, metricsRes] = await Promise.all([
      fetch('/api/settings'),
      fetch('/api/proposals'),
      fetch('/api/metrics'),
    ])
    const [settingsData, proposalsData, metricsData] = await Promise.all([
      settingsRes.json(),
      proposalsRes.json(),
      metricsRes.json(),
    ])
    if (settingsData.success) setSettings(settingsData.data)
    if (proposalsData.success) setProposals(proposalsData.data)
    if (metricsData.success) setMetrics(metricsData.data)
    setDataLoaded(true)
  }, [])

  const refetchProposals = useCallback(async () => {
    const r = await fetch('/api/proposals')
    const d = await r.json()
    if (d.success) setProposals(d.data)
  }, [])

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleGenerateProposals = async () => {
    setGenerating(true)
    try {
      // ✅ Vraie génération IA via /api/proposals/generate
      const res = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 3 }),
      })
      const data = await res.json()
      if (!data.success) {
        if (res.status === 402) {
          alert(data.error) // Limite plan atteinte
        } else {
          throw new Error(data.error)
        }
      } else {
        await refetchProposals()
      }
    } catch (err: any) {
      console.error('Génération IA échouée:', err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleUpdateProposal = async (id: string, status: string) => {
    await fetch('/api/proposals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    await refetchProposals()
  }

  const handlePublishProposal = async (id: string) => {
    try {
      const res = await fetch('/api/linkedin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: id }),
      })
      const data = await res.json()
      if (!data.success) {
        if (res.status === 401) {
          alert('Session expirée. Reconnectez-vous.')
          window.location.href = '/login'
          return
        }
        if (res.status === 402) {
          alert(data.error + (data.upgrade ? '\n\nPassez à l\'offre supérieure sur /pricing' : ''))
          return
        }
        if (data.code === 'NO_LINKEDIN_ACCOUNT') {
          alert('Aucun compte LinkedIn connecté. Allez dans l\'onboarding pour le connecter.')
          return
        }
        if (data.code === 'TOKEN_EXPIRED' || data.code === 'TOKEN_INVALID') {
          alert('Token LinkedIn expiré. Reconnectez votre compte LinkedIn.')
          window.location.href = '/onboarding'
          return
        }
        throw new Error(data.error)
      }
      alert('✅ Post publié sur LinkedIn avec succès !')
      await refetchProposals()
    } catch (err: any) {
      alert('Erreur de publication: ' + err.message)
    }
  }

  const handleSaveSettings = async () => {
    if (!settings) return
    setSaving(true)
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
    setSaving(false)
  }

  const handleNavClick = (tab: string) => {
    setActiveTab(tab)
    setSidebarOpen(false)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    window.location.href = '/login'
  }

  // ============================================================
  // LOADING STATE (pendant la vérification d'auth)
  // ============================================================
  if (!authChecked || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-10 w-10 bg-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <p className="text-slate-500 text-sm">Chargement de LinkedInPost...</p>
        </div>
      </div>
    )
  }

  // ============================================================
  // DASHBOARD
  // ============================================================
  const sidebarSections = [
    {
      title: null,
      items: [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'proposals', label: 'Posts', icon: FileText },
        { id: 'calendar', label: 'Calendrier', icon: Calendar },
        { id: 'comments', label: 'Commentaires', icon: MessageCircle },
        { id: 'messages', label: 'Messages', icon: MessageSquare },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'performance', label: 'Performance IA', icon: Activity },
      ],
    },
    {
      title: 'Profil',
      items: [
        { id: 'profile', label: 'Optimisation profil', icon: User },
      ],
    },
    {
      title: 'Réseau & Prospection',
      items: [
        { id: 'prospecting', label: 'Prospecting', icon: Target },
        { id: 'pipeline', label: 'Pipeline Prospects', icon: Filter },
        { id: 'crm', label: 'CRM Séquences', icon: Mail },
        { id: 'crm-copilot', label: 'CRM Copilot IA', icon: Bot },
        { id: 'networking', label: 'Networking', icon: Network },
      ],
    },
    {
      title: 'Outils IA',
      items: [
        { id: 'agent-ia', label: 'Agent IA', icon: Bot },
        { id: 'mission-scout', label: 'Mission Scout', icon: Search },
        { id: 'templates-ia', label: 'Templates IA', icon: FileCode },
        { id: 'smart-poster', label: 'Smart Poster', icon: Sparkles },
        { id: 'brand-studio', label: 'Brand Studio', icon: Wand2 },
        { id: 'content-quality', label: 'Content Quality', icon: Gauge },
        { id: 'ai-compare', label: 'Multi-IA Compare', icon: Cpu },
      ],
    },
    {
      title: 'Gestion',
      items: [
        { id: 'agency-cc', label: 'Agency Command', icon: Layers },
        { id: 'revenue', label: 'Revenue Attribution', icon: DollarSign },
        { id: 'logs', label: 'Logs', icon: ScrollText },
        { id: 'reports', label: 'Rapports', icon: FileBarChart },
        { id: 'settings', label: 'Paramètres', icon: Settings },
      ],
    },
  ]

  const filteredProposals = proposalFilter === 'all' ? proposals : proposals.filter((p: Proposal) => p.status === proposalFilter)

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col overflow-hidden">
        <DashboardSidebar sections={sidebarSections} activeTab={activeTab} onNav={handleNavClick} onBack={() => window.location.href = '/login'} user={user} onLogout={handleLogout} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 overflow-y-auto">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <DashboardSidebar sections={sidebarSections} activeTab={activeTab} onNav={handleNavClick} onBack={() => window.location.href = '/login'} user={user} onLogout={handleLogout} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-bold text-lg text-slate-900">LinkedInPost</span>
          <div className="ml-auto flex items-center gap-2">
            {linkedinConnected ? (
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-emerald-700 font-medium">Connecté</span>
              </div>
            ) : (
              <a
                href="/connect/linkedin"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0A66C2] text-white text-xs font-medium"
              >
                <Globe className="h-3 w-3" />
                LinkedIn
              </a>
            )}
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>

        {/* Desktop top bar with notifications */}
        <div className="hidden lg:flex sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-2 items-center justify-between">
          {linkedinConnected ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-700 font-medium">{linkedinName}</span>
              <span className="text-emerald-500 text-xs">· LinkedIn connecté</span>
            </div>
          ) : (
            <a
              href="/connect/linkedin"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0A66C2] text-white text-sm font-medium hover:bg-[#0A66C2]/90 transition-colors"
            >
              <Globe className="h-4 w-4" />
              Connecter LinkedIn
            </a>
          )}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
            <a href="/settings" className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <Settings className="h-5 w-5 text-slate-600" />
            </a>
          </div>
        </div>

        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <AgencyDashboard user={user} onNav={handleNavClick} />
              </motion.div>
            )}
            {activeTab === 'smart-poster' && (
              <motion.div key="smart-poster" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <SmartPosterTab settings={settings} setSettings={setSettings} saving={saving} onSave={handleSaveSettings} />
              </motion.div>
            )}
            {activeTab === 'proposals' && (
              <motion.div key="proposals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <ProposalsTab
                  proposals={filteredProposals}
                  filter={proposalFilter}
                  onFilterChange={setProposalFilter}
                  onGenerate={handleGenerateProposals}
                  generating={generating}
                  onUpdate={handleUpdateProposal}
                  onPublish={handlePublishProposal}
                />
              </motion.div>
            )}
            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <AnalyticsTab metrics={metrics} />
              </motion.div>
            )}
            {activeTab === 'performance' && (
              <motion.div key="performance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <PerformanceIntelligenceTab />
              </motion.div>
            )}
            {activeTab === 'agency-cc' && (
              <motion.div key="agency-cc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <AgencyCommandCenterTab />
              </motion.div>
            )}
            {activeTab === 'revenue' && (
              <motion.div key="revenue" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <RevenueAttributionTab />
              </motion.div>
            )}
            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <SettingsTab user={user} onUpdateUser={(u) => setUser(u)} />
              </motion.div>
            )}
            {/* Real functional tabs */}
            {activeTab === 'calendar' && (
              <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <CalendarTab />
              </motion.div>
            )}
            {activeTab === 'templates-ia' && (
              <motion.div key="templates-ia" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <TemplatesTab />
              </motion.div>
            )}
            {activeTab === 'logs' && (
              <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <LogsTab />
              </motion.div>
            )}
            {activeTab === 'reports' && (
              <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <ReportsTab />
              </motion.div>
            )}
            {activeTab === 'agent-ia' && (
              <motion.div key="agent-ia" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="h-full">
                <AgentIATab />
              </motion.div>
            )}
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <ProfileTab />
              </motion.div>
            )}
            {activeTab === 'mission-scout' && (
              <motion.div key="mission-scout" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <ScoutTab />
              </motion.div>
            )}
            {activeTab === 'brand-studio' && (
              <motion.div key="brand-studio" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <BrandStudioTab />
              </motion.div>
            )}
            {activeTab === 'content-quality' && (
              <motion.div key="content-quality" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <ContentQualityTab />
              </motion.div>
            )}
            {activeTab === 'ai-compare' && (
              <motion.div key="ai-compare" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <MultiAICompareTab />
              </motion.div>
            )}
            {activeTab === 'messages' && (
              <motion.div key="messages" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <MessagesTab />
              </motion.div>
            )}
            {activeTab === 'comments' && (
              <motion.div key="comments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <CommentsTab />
              </motion.div>
            )}
            {activeTab === 'prospecting' && (
              <motion.div key="prospecting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <ProspectingTab />
              </motion.div>
            )}
            {activeTab === 'pipeline' && (
              <motion.div key="pipeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <PipelineTab />
              </motion.div>
            )}
            {activeTab === 'crm' && (
              <motion.div key="crm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <CrmTab />
              </motion.div>
            )}
            {activeTab === 'crm-copilot' && (
              <motion.div key="crm-copilot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="h-full">
                <CrmCopilotTab />
              </motion.div>
            )}
            {activeTab === 'networking' && (
              <motion.div key="networking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <NetworkingTab />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

// ============================================================
// DASHBOARD SIDEBAR COMPONENT (with sections)
// ============================================================
function DashboardSidebar({ sections, activeTab, onNav, onBack, user, onLogout }: {
  sections: { title: string | null; items: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] }[]
  activeTab: string
  onNav: (tab: string) => void
  onBack: () => void
  user: CurrentUser | null
  onLogout: () => void
}) {
  const displayName = user?.name || user?.email || 'Utilisateur'
  const initials = displayName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('') || 'U'

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 flex items-center gap-2 border-b border-slate-100 flex-shrink-0">
        <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-lg text-slate-900">LinkedInPost</span>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="mb-3">
            {section.title && (
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1 mt-2">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onNav(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* LinkedIn Account Switcher */}
      <div className="px-3 pb-2 border-t border-slate-100 pt-2 flex-shrink-0">
        <p className="text-[10px] font-medium text-slate-400 uppercase mb-1 px-1">Compte LinkedIn</p>
        <LinkedInAccountSwitcher />
      </div>

      <div className="p-2 border-t border-slate-100 space-y-1 flex-shrink-0">
        <a
          href="/team"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
        >
          <Users className="h-4.5 w-4.5 text-slate-400" />
          Mon équipe
        </a>
        <a
          href="/pricing"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
        >
          <Crown className="h-4.5 w-4.5 text-slate-400" />
          Abonnement
        </a>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
        >
          <LogOut className="h-4.5 w-4.5 text-slate-400" />
          Déconnexion
        </button>
        <button
          onClick={onBack}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
        >
          <ArrowRight className="h-4.5 w-4.5 text-slate-400 rotate-180" />
          Retour au site
        </button>
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">
              {user ? `Plan ${user.plan}${user.trialActive ? ' · Essai' : ''}` : 'Non connecté'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// OVERVIEW TAB
// ============================================================
function OverviewTab({ proposals, metrics, user }: { proposals: Proposal[]; metrics: Metric[]; user: CurrentUser | null }) {
  const recentProposals = proposals.slice(0, 3)
  const chartData = metrics.slice(-7).map((m) => ({
    name: new Date(m.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
    engagement: m.likes + m.comments + m.shares,
  }))

  // ✅ Vraies stats calculées depuis les metrics (au lieu de valeurs en dur)
  const last14Days = metrics.slice(-14)
  const totalPosts = proposals.length
  const totalLikes = last14Days.reduce((a, m) => a + m.likes, 0)
  const totalComments = last14Days.reduce((a, m) => a + m.comments, 0)
  const totalShares = last14Days.reduce((a, m) => a + m.shares, 0)
  const totalViews = last14Days.reduce((a, m) => a + m.views, 0)
  const totalEngagement = totalLikes + totalComments + totalShares
  const engagementRate = totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(1) : '0.0'

  // Variation vs période précédente (si on a au moins 28 jours)
  const previous14Days = metrics.slice(-28, -14)
  const prevEngagement = previous14Days.reduce((a, m) => a + m.likes + m.comments + m.shares, 0)
  const engagementChange = prevEngagement > 0
    ? `${totalEngagement > prevEngagement ? '+' : ''}${(((totalEngagement - prevEngagement) / prevEngagement) * 100).toFixed(0)}%`
    : '—'
  const prevViews = previous14Days.reduce((a, m) => a + m.views, 0)
  const viewsChange = prevViews > 0
    ? `${totalViews > prevViews ? '+' : ''}${(((totalViews - prevViews) / prevViews) * 100).toFixed(0)}%`
    : '—'

  const firstName = user?.name?.split(' ')[0] || (user?.email ? user.email.split('@')[0] : 'cher utilisateur')

  const statCards = [
    { label: 'Posts générés', value: String(totalPosts), change: totalPosts > 0 ? 'Actifs' : '—', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: "Taux d'engagement", value: `${engagementRate}%`, change: engagementChange, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Interactions (14j)', value: String(totalEngagement), change: engagementChange, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Portée (14j)', value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : String(totalViews), change: viewsChange, icon: Eye, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Bonjour {firstName} 👋</h1>
        <p className="text-slate-500 mt-1">Voici un aperçu de votre activité LinkedIn</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                      <Icon className={`h-4.5 w-4.5 ${stat.color}`} />
                    </div>
                    <Badge variant="secondary" className="text-emerald-700 bg-emerald-50 text-xs">{stat.change}</Badge>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Chart + Recent Proposals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Chart */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Engagement - 7 derniers jours</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="engagementGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                    />
                    <Area type="monotone" dataKey="engagement" stroke="#059669" strokeWidth={2.5} fill="url(#engagementGrad)" name="Engagement" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <Skeleton className="h-full w-full" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Proposals */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Propositions récentes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {recentProposals.length === 0 ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              recentProposals.map((p) => (
                <div key={p.id} className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900 line-clamp-1">{p.title}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">{p.format}</Badge>
                    <Badge variant="outline" className="text-xs">{p.angle}</Badge>
                    <ScoreBadge score={p.qualityScore} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// SMART POSTER TAB
// ============================================================
function SmartPosterTab({ settings, setSettings, saving, onSave }: {
  settings: Settings | null
  setSettings: React.Dispatch<React.SetStateAction<Settings | null>>
  saving: boolean
  onSave: () => void
}) {
  if (!settings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    )
  }

  const hours = Array.from({ length: 17 }, (_, i) => i + 6) // 6 to 22

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-emerald-600" />
          Smart Poster
        </h1>
        <p className="text-slate-500 mt-1">Configurez votre générateur de contenu IA</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Configuration de la génération</CardTitle>
          <CardDescription>Définissez les paramètres pour la création automatique de vos posts LinkedIn</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Max Posts Per Day */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-700">Posts maximum par jour</Label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => setSettings({ ...settings, maxPostsPerDay: Math.max(1, settings.maxPostsPerDay - 1) })}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="text-center min-w-16">
                <span className="text-4xl font-bold text-emerald-600">{settings.maxPostsPerDay}</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => setSettings({ ...settings, maxPostsPerDay: Math.min(10, settings.maxPostsPerDay + 1) })}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Toggles */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-slate-700">Génération automatique</Label>
                <p className="text-xs text-slate-500 mt-0.5">L'IA génère du contenu automatiquement selon le planning</p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-slate-700">Approbation automatique</Label>
                <p className="text-xs text-slate-500 mt-0.5">Les posts sont publiés sans validation manuelle</p>
              </div>
              <Switch
                checked={settings.autoApprove}
                onCheckedChange={(checked) => setSettings({ ...settings, autoApprove: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Heure de début de publication</Label>
              <Select
                value={String(settings.scheduleHourStart)}
                onValueChange={(v) => setSettings({ ...settings, scheduleHourStart: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((h) => (
                    <SelectItem key={h} value={String(h)}>{String(h).padStart(2, '0')}:00</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Heure de fin de publication</Label>
              <Select
                value={String(settings.scheduleHourEnd)}
                onValueChange={(v) => setSettings({ ...settings, scheduleHourEnd: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((h) => (
                    <SelectItem key={h} value={String(h)}>{String(h).padStart(2, '0')}:00</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Topics */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Sujets de prédilection</Label>
            <p className="text-xs text-slate-500">Séparez les sujets par des virgules</p>
            <Input
              value={settings.topics}
              onChange={(e) => setSettings({ ...settings, topics: e.target.value })}
              placeholder="IA, tech, marketing digital..."
              className="max-w-xl"
            />
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Ton du contenu</Label>
            <Select
              value={settings.tone}
              onValueChange={(v) => setSettings({ ...settings, tone: v })}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Professionnel">Professionnel</SelectItem>
                <SelectItem value="Décontracté">Décontracté</SelectItem>
                <SelectItem value="Inspirant">Inspirant</SelectItem>
                <SelectItem value="Provocateur">Provocateur</SelectItem>
                <SelectItem value="Éducatif">Éducatif</SelectItem>
                <SelectItem value="Humoristique">Humoristique</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Langue</Label>
            <Select
              value={settings.language}
              onValueChange={(v) => setSettings({ ...settings, language: v })}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">Anglais</SelectItem>
                <SelectItem value="mixte">Mixte</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Audience cible</Label>
            <Input
              value={settings.targetAudience}
              onChange={(e) => setSettings({ ...settings, targetAudience: e.target.value })}
              placeholder="Entrepreneurs, CTO, managers..."
              className="max-w-xl"
            />
          </div>
        </CardContent>
        <CardFooter className="border-t border-slate-100 px-6 py-4">
          <Button onClick={onSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <RefreshCw className="h-4 w-4 mr-2" />
              </motion.div>
            ) : null}
            {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

// ============================================================
// PROPOSALS TAB
// ============================================================
function ProposalsTab({ proposals, filter, onFilterChange, onGenerate, generating, onUpdate, onPublish }: {
  proposals: Proposal[]
  filter: string
  onFilterChange: (f: string) => void
  onGenerate: () => void
  generating: boolean
  onUpdate: (id: string, status: string) => void
  onPublish: (id: string) => Promise<void>
}) {
  const [publishingId, setPublishingId] = useState<string | null>(null)

  const handlePublish = async (id: string) => {
    if (!confirm('Publier ce post sur LinkedIn maintenant ?')) return
    setPublishingId(id)
    try {
      await onPublish(id)
    } finally {
      setPublishingId(null)
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-7 w-7 text-emerald-600" />
            Propositions
          </h1>
          <p className="text-slate-500 mt-1">{proposals.length} proposition(s) trouvée(s)</p>
        </div>
        <Button onClick={onGenerate} disabled={generating} className="bg-emerald-600 hover:bg-emerald-700 text-white self-start">
          {generating ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              <RefreshCw className="h-4 w-4 mr-2" />
            </motion.div>
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {generating ? 'Génération en cours...' : 'Générer de nouvelles propositions'}
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={onFilterChange}>
        <TabsList>
          <TabsTrigger value="all">Tous</TabsTrigger>
          <TabsTrigger value="pending">En attente</TabsTrigger>
          <TabsTrigger value="approved">Approuvés</TabsTrigger>
          <TabsTrigger value="rejected">Rejetés</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Proposals List */}
      <div className="space-y-4">
        {proposals.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Aucune proposition trouvée</p>
              <p className="text-sm text-slate-400 mt-1">Cliquez sur le bouton ci-dessus pour générer du contenu</p>
            </CardContent>
          </Card>
        ) : (
          proposals.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Header */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">{p.title}</h3>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">{p.format}</Badge>
                        <Badge variant="outline" className="text-xs">{p.angle}</Badge>
                        <ScoreBadge score={p.qualityScore} />
                        <StatusBadge status={p.status} />
                        <Badge variant="secondary" className="text-xs bg-slate-100">
                          <Clock className="h-3 w-3 mr-1" />
                          {p.optimalTime}
                        </Badge>
                      </div>

                      {/* Content Preview */}
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {p.content.length > 150 ? p.content.slice(0, 150) + '...' : p.content}
                      </p>

                      {/* Hashtags */}
                      <div className="flex flex-wrap gap-1.5">
                        {p.hashtags.split(' ').map((tag, idx) => (
                          <span key={idx} className="text-xs text-emerald-600 font-medium">#{tag.replace('#', '')}</span>
                        ))}
                      </div>

                      {/* Engagement Est */}
                      <p className="text-xs text-slate-400">
                        Engagement estimé : <span className="text-slate-600 font-medium">{p.engagementEst} interactions</span>
                      </p>
                    </div>

                    {/* Actions */}
                    {p.status === 'pending' && (
                      <div className="flex md:flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => onUpdate(p.id, 'approved')}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => onUpdate(p.id, 'rejected')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rejeter
                        </Button>
                      </div>
                    )}
                    {p.status === 'approved' && (
                      <div className="flex md:flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white"
                          onClick={() => handlePublish(p.id)}
                          disabled={publishingId === p.id}
                        >
                          {publishingId === p.id ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                              <RefreshCw className="h-4 w-4 mr-1" />
                            </motion.div>
                          ) : (
                            <Send className="h-4 w-4 mr-1" />
                          )}
                          {publishingId === p.id ? 'Publication...' : 'Publier'}
                        </Button>
                      </div>
                    )}
                    {p.status === 'published' && (
                      <div className="flex items-center gap-1 shrink-0 text-emerald-600 text-sm font-medium">
                        <Check className="h-4 w-4" />
                        Publié
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

// ============================================================
// ANALYTICS TAB
// ============================================================
function AnalyticsTab({ metrics }: { metrics: Metric[] }) {
  const totalLikes = metrics.reduce((a, m) => a + m.likes, 0)
  const totalComments = metrics.reduce((a, m) => a + m.comments, 0)
  const totalShares = metrics.reduce((a, m) => a + m.shares, 0)
  const totalViews = metrics.reduce((a, m) => a + m.views, 0)

  const lineData = metrics.slice(-14).map((m) => ({
    name: new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    Likes: m.likes,
    Commentaires: m.comments,
    Partages: m.shares,
  }))

  const barData = metrics.slice(-14).map((m) => ({
    name: new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    Vues: m.views,
  }))

  const engagementData = metrics.slice(-14).map((m) => {
    const total = m.likes + m.comments + m.shares
    const rate = m.views > 0 ? ((total / m.views) * 100).toFixed(2) : 0
    return {
      name: new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      "Taux d'engagement": parseFloat(rate as string),
    }
  })

  const summaryCards = [
    { label: 'Total Likes', value: totalLikes.toLocaleString('fr-FR'), icon: ThumbsUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Commentaires', value: totalComments.toLocaleString('fr-FR'), icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Partages', value: totalShares.toLocaleString('fr-FR'), icon: Share2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Vues', value: totalViews.toLocaleString('fr-FR'), icon: Eye, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-emerald-600" />
          Analytics
        </h1>
        <p className="text-slate-500 mt-1">Analyse détaillée de vos performances LinkedIn</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                      <Icon className={`h-4.5 w-4.5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                      <p className="text-xs text-slate-500">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Line Chart - Likes, Comments, Shares */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Likes, Commentaires & Partages (14 jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            {lineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="Likes" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Commentaires" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Partages" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-full w-full" />}
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart - Views */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Vues par jour (14 jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                  <Bar dataKey="Vues" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-full w-full" />}
          </div>
        </CardContent>
      </Card>

      {/* Engagement Rate Trend */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Tendance du taux d&apos;engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            {engagementData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={engagementData}>
                  <defs>
                    <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" unit="%" />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                  <Area type="monotone" dataKey="Taux d'engagement" stroke="#0d9488" strokeWidth={2.5} fill="url(#rateGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-full w-full" />}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// PLACEHOLDER TAB (for new sections from old version)
// ============================================================
function PlaceholderTab({ tabId }: { tabId: string }) {
  const tabInfo: Record<string, { title: string; description: string; icon: any }> = {
    'calendar': { title: 'Calendrier', description: 'Planifiez et visualisez vos publications à venir', icon: Calendar },
    'messages': { title: 'Messages', description: 'Gérez vos conversations LinkedIn', icon: MessageSquare },
    'profile': { title: 'Optimisation profil', description: 'Analysez et optimisez votre profil LinkedIn', icon: User },
    'prospecting': { title: 'Prospecting', description: 'Trouvez de nouveaux prospects sur LinkedIn', icon: Target },
    'pipeline': { title: 'Pipeline Prospects', description: 'Suivez vos prospects dans le funnel de conversion', icon: Filter },
    'crm': { title: 'CRM Séquences', description: 'Automatisez vos séquences de messages', icon: Mail },
    'crm-copilot': { title: 'CRM Copilot IA', description: 'Agent IA avec contexte complet prospects/clients/messages', icon: Bot },
    'networking': { title: 'Networking', description: 'Développez votre réseau LinkedIn', icon: Network },
    'agent-ia': { title: 'Agent IA', description: 'Votre assistant IA pour LinkedIn', icon: Bot },
    'mission-scout': { title: 'Mission Scout', description: 'Identifiez les opportunités et tendances', icon: Search },
    'brand-studio': { title: 'Personal Brand Studio', description: 'Analysez votre voix éditoriale et créez votre marque personnelle', icon: Wand2 },
    'content-quality': { title: 'Content Quality Studio', description: 'Scorez vos posts et obtenez des suggestions d\'amélioration', icon: Gauge },
    'ai-compare': { title: 'Multi-IA Comparison', description: 'Comparez les réponses de tous les providers IA en parallèle', icon: Cpu },
    'performance': { title: 'Performance Intelligence', description: 'Analytics avancés + recommandations IA personnalisées', icon: Activity },
    'agency-cc': { title: 'Agency Command Center', description: 'Vue stratégique multi-clients avec KPIs, alertes et tendances', icon: Layers },
    'revenue': { title: 'Revenue Attribution', description: 'Attribuez et suivez le revenu par client et par prospect', icon: DollarSign },
    'templates-ia': { title: 'Templates IA', description: 'Bibliothèque de templates de posts par industrie', icon: FileCode },
    'logs': { title: 'Logs', description: 'Historique des actions et erreurs', icon: ScrollText },
    'reports': { title: 'Rapports', description: 'Rapports de performance détaillés', icon: FileBarChart },
  }

  const info = tabInfo[tabId] || { title: tabId, description: '', icon: Sparkles }
  const Icon = info.icon

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Icon className="h-7 w-7 text-emerald-600" />
          {info.title}
        </h1>
        <p className="text-slate-500 mt-1">{info.description}</p>
      </div>
      <Card className="border-slate-200">
        <CardContent className="py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-4">
            <Icon className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">{info.title}</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
            Cette fonctionnalité est en cours de développement.
            Elle sera disponible prochainement.
          </p>
          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
            Bientôt disponible
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// SETTINGS TAB
// ============================================================
function SettingsTab({ user, onUpdateUser }: { user: CurrentUser | null; onUpdateUser?: (u: CurrentUser) => void }) {
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const email = user?.email || ''
  const plan = user?.plan || 'free'
  const trialActive = user?.trialActive
  const trialEndsAt = user?.trialEndsAt ? new Date(user.trialEndsAt).toLocaleDateString('fr-FR') : null

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      if (onUpdateUser) onUpdateUser(d.data)
      toast.success('Profil mis à jour !')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="h-7 w-7 text-emerald-600" />
          Paramètres
        </h1>
        <p className="text-slate-500 mt-1">Gérez votre compte et vos préférences</p>
      </div>

      {/* Account Settings */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Paramètres du compte</CardTitle>
          <CardDescription>Informations personnelles de votre compte</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Nom complet</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Email</Label>
              <Input defaultValue={email} type="email" disabled />
            </div>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white mt-2" onClick={handleSave} disabled={saving}>
            {saving ? 'Sauvegarde...' : 'Mettre à jour'}
          </Button>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Abonnement
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 uppercase">{plan}</Badge>
            {trialActive && (
              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                Essai
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Votre plan actuel et la facturation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-slate-900 capitalize">Plan {plan}</p>
              <p className="text-sm text-slate-500">
                {trialActive && trialEndsAt
                  ? `Essai gratuit jusqu'au ${trialEndsAt}`
                  : plan === 'free'
                  ? 'Plan gratuit — limites applicables'
                  : `Renouvellement mensuel`}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {plan === 'free' && (
                  <>
                    <Badge variant="secondary" className="text-xs">3 posts/jour</Badge>
                    <Badge variant="secondary" className="text-xs">1 compte LinkedIn</Badge>
                  </>
                )}
                {plan === 'pro' && (
                  <>
                    <Badge variant="secondary" className="text-xs">20 posts/jour</Badge>
                    <Badge variant="secondary" className="text-xs">3 comptes LinkedIn</Badge>
                    <Badge variant="secondary" className="text-xs">Smart Poster IA</Badge>
                    <Badge variant="secondary" className="text-xs">Support prioritaire</Badge>
                  </>
                )}
                {plan === 'business' && (
                  <>
                    <Badge variant="secondary" className="text-xs">Posts illimités</Badge>
                    <Badge variant="secondary" className="text-xs">Multi-utilisateurs</Badge>
                    <Badge variant="secondary" className="text-xs">White-label</Badge>
                  </>
                )}
              </div>
            </div>
            <a href="/pricing"><Button variant="outline">Changer de plan</Button></a>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>Configurez comment vous souhaitez être notifié</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <Mail className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Notifications par email</Label>
                <p className="text-xs text-slate-500">Recevez les mises à jour par email</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <Bell className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Notifications push</Label>
                <p className="text-xs text-slate-500">Notifications dans le navigateur</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <Activity className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Résumé quotidien</Label>
                <p className="text-xs text-slate-500">Un résumé de votre activité chaque matin</p>
              </div>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-red-600">Zone dangereuse</CardTitle>
          <CardDescription>Actions irréversibles pour votre compte</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Supprimer le compte</p>
              <p className="text-xs text-slate-500">Cette action est irréversible et supprimera toutes vos données</p>
            </div>
            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer le compte
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// HELPER COMPONENTS
// ============================================================
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
    approved: { label: 'Approuvé', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
    rejected: { label: 'Rejeté', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  }
  const info = map[status] || { label: status, className: '' }
  return <Badge className={`text-xs ${info.className}`}>{info.label}</Badge>
}

function ScoreBadge({ score }: { score: number }) {
  let color = 'text-red-600 bg-red-50'
  if (score > 8) color = 'text-emerald-600 bg-emerald-50'
  else if (score > 6) color = 'text-yellow-600 bg-yellow-50'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${color}`}>
      {score}/10
    </span>
  )
}

// ============================================================
// LANDING PAGE
// ============================================================
function LandingPage({ onLogin, onCTA }: { onLogin: () => void; onCTA: () => void }) {
  const [typedText, setTypedText] = useState('')
  const fullText = "🚀 5 stratégies qui ont multiplié mon engagement LinkedIn par 10...\n\n1️⃣ Publier au bon moment\n2️⃣ Raconter des histoires\n3️⃣ Utiliser l'IA pour optimiser\n4️⃣ Engager dans les 30 min\n5️⃣ Être authentique\n\nRésultat : +150% de visibilité en 30 jours ✨"

  useEffect(() => {
    let idx = 0
    const timer = setInterval(() => {
      if (idx <= fullText.length) {
        setTypedText(fullText.slice(0, idx))
        idx++
      } else {
        clearInterval(timer)
      }
    }, 25)
    return () => clearInterval(timer)
  }, [])

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
    }),
  }

  const stagger = {
    visible: { transition: { staggerChildren: 0.1 } },
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ===== NAVBAR ===== */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900">LinkedInPost</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#fonctionnalites" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Fonctionnalités</a>
              <a href="#tarifs" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Tarifs</a>
              <a href="#temoignages" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Témoignages</a>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="hidden sm:flex" onClick={onLogin}>Connexion</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200" onClick={onCTA}>
                Démarrer gratuitement
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-30 translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-100 rounded-full blur-3xl opacity-20 -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 lg:py-36">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeInUp} custom={0}>
              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 mb-6 text-sm px-4 py-1.5">
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Propulsé par l&apos;IA de dernière génération
              </Badge>
            </motion.div>

            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight"
              variants={fadeInUp}
              custom={1}
            >
              Transformez votre{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                présence LinkedIn
              </span>{' '}
              avec l&apos;IA
            </motion.h1>

            <motion.p
              className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
              variants={fadeInUp}
              custom={2}
            >
              LinkedInPost génère, optimise et planifie automatiquement votre contenu LinkedIn.
              Gagnez du temps, boostez votre engagement et développez votre réseau plus rapidement.
            </motion.p>

            <motion.div
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
              variants={fadeInUp}
              custom={3}
            >
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 text-base px-8 h-12"
                onClick={onCTA}
              >
                Essai gratuit 14 jours
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12" onClick={onLogin}>
                <Play className="h-4 w-4 mr-2" />
                Démarrer
              </Button>
            </motion.div>

            {/* Mockup Card */}
            <motion.div
              className="mt-16 md:mt-20 max-w-2xl mx-auto"
              variants={fadeInUp}
              custom={4}
            >
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200/50 p-6 md:p-8 text-left">
                <div className="flex items-center gap-3 mb-5">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-bold">AD</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-slate-900">Alexandre Dupont</p>
                    <p className="text-sm text-slate-500">CEO @ LinkedInPost · IA & Marketing</p>
                  </div>
                  <Badge className="ml-auto bg-emerald-100 text-emerald-700 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Généré par IA
                  </Badge>
                </div>
                <div className="min-h-40">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">{typedText}<span className="inline-block w-0.5 h-4 bg-emerald-500 animate-pulse ml-0.5 align-middle" /></pre>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-6 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5"><ThumbsUp className="h-4 w-4" /> 247</span>
                  <span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> 42</span>
                  <span className="flex items-center gap-1.5"><Share2 className="h-4 w-4" /> 18</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="bg-slate-900 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: '10x', label: "plus d'engagement", icon: TrendingUp },
              { value: '3h', label: 'économisées/semaine', icon: Clock },
              { value: '+150%', label: 'de visibilité', icon: Eye },
              { value: '500+', label: 'clients satisfaits', icon: Users },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <stat.icon className="h-6 w-6 text-emerald-400 mx-auto mb-3" />
                <p className="text-3xl md:text-4xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="fonctionnalites" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 mb-4">Fonctionnalités</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Tout ce dont vous avez besoin pour dominer LinkedIn</h2>
            <p className="text-slate-600 mt-4 text-lg">Une suite complète d&apos;outils alimentés par l&apos;IA pour transformer votre stratégie de contenu.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: Bot, emoji: '🤖', title: 'Génération IA', desc: 'Posts optimisés automatiquement grâce à notre modèle IA entraîné sur les meilleurs contenus LinkedIn.' },
              { icon: BarChartIcon, emoji: '📊', title: 'Analytics Avancés', desc: 'Métriques d\'engagement en temps réel. Comprenez ce qui fonctionne et optimisez votre stratégie.' },
              { icon: Clock, emoji: '⏰', title: 'Planification Intelligente', desc: 'Publication au meilleur moment pour maximiser la portée et l\'engagement de vos posts.' },
              { icon: Target, emoji: '🎯', title: 'Ciblage Audience', desc: 'Contenu adapté à votre marché cible pour attirer les bons prospects et partenaires.' },
              { icon: RefreshCw, emoji: '🔄', title: 'Contenu Viral', desc: 'Formats et structures qui génèrent naturellement des partages et de la viralité.' },
              { icon: Cog, emoji: '⚙️', title: 'Paramétrage Fin', desc: 'Contrôle total de votre stratégie : ton, fréquence, sujets, audience et plus encore.' },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full border-slate-200 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all duration-300 group">
                  <CardContent className="p-6 md:p-8">
                    <div className="text-3xl mb-4">{feature.emoji}</div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">{feature.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-20 md:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 mb-4">Comment ça marche</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Lancez-vous en 3 étapes simples</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[
              { step: '01', title: 'Connectez LinkedIn', desc: 'Lie votre compte LinkedIn en un clic avec notre connexion sécurisée OAuth.', icon: Globe },
              { step: '02', title: 'Configurez l\'IA', desc: 'Définissez vos sujets, ton et audience. L\'IA apprend votre style et vos préférences.', icon: Cog },
              { step: '03', title: 'Publiez et croissez', desc: 'L\'IA génère et publie du contenu optimisé. Suivez vos résultats en temps réel.', icon: Rocket },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className="relative text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-px border-t-2 border-dashed border-slate-300" />
                )}
                <div className="relative inline-flex items-center justify-center h-24 w-24 rounded-2xl bg-emerald-600 text-white mb-6 shadow-lg shadow-emerald-200">
                  <item.icon className="h-10 w-10" />
                  <span className="absolute -top-2 -right-2 h-7 w-7 bg-slate-900 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 max-w-xs mx-auto">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="tarifs" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 mb-4">Tarifs</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Des plans adaptés à vos ambitions</h2>
            <p className="text-slate-600 mt-4 text-lg">Commencez gratuitement et évoluez à votre rythme. Pas de carte requise.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
            >
              <Card className="h-full border-slate-200 shadow-sm hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-lg text-slate-900">Starter</CardTitle>
                  <CardDescription>Pour débuter sur LinkedIn</CardDescription>
                </CardHeader>
                <CardContent className="text-center pb-2">
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-slate-900">29€</span>
                    <span className="text-slate-500 text-sm">/mois</span>
                  </div>
                  <ul className="space-y-3 text-left text-sm text-slate-600">
                    {['3 posts par jour', 'Analytics basiques', '1 compte LinkedIn', 'Support email', 'Templates de base'].map((f) => (
                      <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" />{f}</li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={onCTA}>Commencer</Button>
                </CardFooter>
              </Card>
            </motion.div>

            {/* Pro */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full border-2 border-emerald-500 shadow-lg shadow-emerald-100 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 px-3 py-1">
                    <Star className="h-3 w-3 mr-1" />
                    Populaire
                  </Badge>
                </div>
                <CardHeader className="text-center pb-2 pt-6">
                  <CardTitle className="text-lg text-slate-900">Pro</CardTitle>
                  <CardDescription>Pour les créateurs sérieux</CardDescription>
                </CardHeader>
                <CardContent className="text-center pb-2">
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-slate-900">79€</span>
                    <span className="text-slate-500 text-sm">/mois</span>
                  </div>
                  <ul className="space-y-3 text-left text-sm text-slate-600">
                    {['10 posts par jour', 'Analytics avancés', '3 comptes LinkedIn', 'Support prioritaire', 'Smart Poster IA', 'Planification intelligente', 'Export CSV'].map((f) => (
                      <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" />{f}</li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200" onClick={onCTA}>
                    Commencer
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>

            {/* Enterprise */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full border-slate-200 shadow-sm hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-lg text-slate-900">Enterprise</CardTitle>
                  <CardDescription>Pour les équipes et agences</CardDescription>
                </CardHeader>
                <CardContent className="text-center pb-2">
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-slate-900">199€</span>
                    <span className="text-slate-500 text-sm">/mois</span>
                  </div>
                  <ul className="space-y-3 text-left text-sm text-slate-600">
                    {['Posts illimités', 'Analytics complets + API', 'Comptes illimités', 'Account manager dédié', 'Intégration webhook', 'SSO & Sécurité', 'SLA garanti'].map((f) => (
                      <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" />{f}</li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={onCTA}>Contacter les ventes</Button>
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section id="temoignages" className="py-20 md:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 mb-4">Témoignages</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Ils nous font confiance</h2>
            <p className="text-slate-600 mt-4 text-lg">Découvrez comment nos clients ont transformé leur présence LinkedIn.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                name: 'Sophie Martin',
                role: 'CEO, TechVision',
                initials: 'SM',
                text: "LinkedInPost a complètement transformé ma stratégie LinkedIn. Mon engagement a triplé en seulement 2 mois. L'IA comprend parfaitement mon ton et mon audience. Un outil indispensable !",
                stars: 5,
              },
              {
                name: 'Thomas Leclerc',
                role: 'Directeur Marketing, ScaleUp',
                initials: 'TL',
                text: "En tant que CMO, j'ai testé de nombreux outils. LinkedInPost est de loin le meilleur pour le contenu LinkedIn. Le Smart Poster nous fait gagner 3 heures par semaine et la qualité est au rendez-vous.",
                stars: 5,
              },
              {
                name: 'Marie Dubois',
                role: 'Consultante, Growth Partners',
                initials: 'MD',
                text: "Je recommande LinkedInPost à tous mes clients. L'approche IA est pertinente et les résultats sont concrets : +200% d'abonnés en 3 mois. L'interface est intuitive et le support est réactif.",
                stars: 5,
              },
            ].map((testimonial, i) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full border-slate-200 shadow-sm">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: testimonial.stars }).map((_, si) => (
                        <Star key={si} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-6">&ldquo;{testimonial.text}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">{testimonial.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{testimonial.name}</p>
                        <p className="text-xs text-slate-500">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-16 md:px-16 md:py-24 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500 rounded-full blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-teal-500 rounded-full blur-3xl opacity-20 translate-x-1/2 translate-y-1/2" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                Prêt à transformer votre LinkedIn ?
              </h2>
              <p className="mt-4 text-lg text-slate-300 max-w-xl mx-auto">
                Rejoignez plus de 500 professionnels qui font confiance à LinkedInPost pour développer leur présence en ligne.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/30 text-base px-8 h-12"
                  onClick={onCTA}
                >
                  Démarrer gratuitement
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-600 text-white hover:bg-slate-800 text-base px-8 h-12"
                  onClick={onLogin}
                >
                  Démarrer
                </Button>
              </div>
              <p className="mt-6 text-sm text-slate-400">14 jours d&apos;essai gratuit · Sans carte bancaire · Annulation à tout moment</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-lg text-white">LinkedInPost</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">Transformez votre présence LinkedIn avec la puissance de l&apos;IA.</p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Produit</h4>
              <ul className="space-y-2.5">
                <li><Link href="/#fonctionnalites" className="text-sm text-slate-400 hover:text-white transition-colors">Fonctionnalités</Link></li>
                <li><Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Tarifs</Link></li>
                <li><Link href="/blog" className="text-sm text-slate-400 hover:text-white transition-colors">Blog</Link></li>
                <li><a href="/affiliate" className="text-sm text-slate-400 hover:text-white transition-colors">Affiliation</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Entreprise</h4>
              <ul className="space-y-2.5">
                <li><Link href="/blog" className="text-sm text-slate-400 hover:text-white transition-colors">Blog</Link></li>
                <li><a href="/affiliate" className="text-sm text-slate-400 hover:text-white transition-colors">Affiliation</a></li>
                <li><a href="/legal/notice" className="text-sm text-slate-400 hover:text-white transition-colors">Contact</a></li>
                <li><a href="/setup" className="text-sm text-slate-400 hover:text-white transition-colors">Aide</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Légal</h4>
              <ul className="space-y-2.5">
                <li><a href="/legal/terms" className="text-sm text-slate-400 hover:text-white transition-colors">CGU</a></li>
                <li><a href="/legal/privacy" className="text-sm text-slate-400 hover:text-white transition-colors">Confidentialité</a></li>
                <li><a href="/legal/notice" className="text-sm text-slate-400 hover:text-white transition-colors">Mentions légales</a></li>
                <li><a href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Tarifs</a></li>
              </ul>
            </div>
          </div>

          <Separator className="my-8 bg-slate-800" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">© 2025 LinkedInPost. Tous droits réservés.</p>
            <div className="flex items-center gap-4">
              <Link href="/blog" className="text-slate-500 hover:text-white transition-colors"><Globe className="h-5 w-5" /></Link>
              <a href="/affiliate" className="text-slate-500 hover:text-white transition-colors"><MessageCircle className="h-5 w-5" /></a>
              <a href="/setup" className="text-slate-500 hover:text-white transition-colors"><Share2 className="h-5 w-5" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}