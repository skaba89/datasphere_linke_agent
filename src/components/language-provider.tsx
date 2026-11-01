'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

// ============================================================
// Language Provider — i18n FR/EN
//
// Provider basique : FR par défaut, toggle EN.
// Les traductions sont stockées dans un dictionnaire simple
// (pas de solution lourde type next-intl pour cette phase).
// ============================================================

export type Lang = 'fr' | 'en'

type LanguageContextValue = {
  lang: Lang
  setLang: (l: Lang) => void
  toggle: () => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

const STORAGE_KEY = 'datasphere-lang'

// ─── Dictionary ───
const dict: Record<Lang, Record<string, string>> = {
  fr: {
    // Common
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.add': 'Ajouter',
    'common.edit': 'Modifier',
    'common.send': 'Envoyer',
    'common.close': 'Fermer',
    'common.search': 'Rechercher',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.confirm': 'Confirmer',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.previous': 'Précédent',
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.posts': 'Posts',
    'dashboard.calendar': 'Calendrier',
    'dashboard.comments': 'Commentaires',
    'dashboard.messages': 'Messages',
    'dashboard.analytics': 'Analytics',
    'dashboard.performance': 'Performance IA',
    'dashboard.settings': 'Paramètres',
    'dashboard.profile': 'Optimisation profil',
    // Sidebar sections
    'sidebar.tools_ia': 'Outils IA',
    'sidebar.management': 'Gestion',
    'sidebar.network_prospecting': 'Réseau & Prospection',
    // Theme
    'theme.toggle_light': 'Passer en mode clair',
    'theme.toggle_dark': 'Passer en mode sombre',
    // Language
    'lang.toggle': 'EN',
    'lang.french': 'Français',
    'lang.english': 'Anglais',
  },
  en: {
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.add': 'Add',
    'common.edit': 'Edit',
    'common.send': 'Send',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.posts': 'Posts',
    'dashboard.calendar': 'Calendar',
    'dashboard.comments': 'Comments',
    'dashboard.messages': 'Messages',
    'dashboard.analytics': 'Analytics',
    'dashboard.performance': 'AI Performance',
    'dashboard.settings': 'Settings',
    'dashboard.profile': 'Profile optimization',
    // Sidebar sections
    'sidebar.tools_ia': 'AI Tools',
    'sidebar.management': 'Management',
    'sidebar.network_prospecting': 'Network & Prospecting',
    // Theme
    'theme.toggle_light': 'Switch to light mode',
    'theme.toggle_dark': 'Switch to dark mode',
    // Language
    'lang.toggle': 'FR',
    'lang.french': 'French',
    'lang.english': 'English',
  },
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let initial: Lang = 'fr'
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null
      if (stored === 'fr' || stored === 'en') {
        initial = stored
      }
    } catch {}
    setLangState(initial)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {}
  }, [lang, mounted])

  const setLang = (l: Lang) => setLangState(l)
  const toggle = () => setLangState(prev => (prev === 'fr' ? 'en' : 'fr'))

  const t = (key: string, params?: Record<string, string | number>): string => {
    let value = dict[lang][key] || dict.fr[key] || key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      }
    }
    return value
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    return {
      lang: 'fr' as Lang,
      setLang: () => {},
      toggle: () => {},
      t: (key: string) => key,
    }
  }
  return ctx
}
