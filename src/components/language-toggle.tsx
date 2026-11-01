'use client'

import { Button } from '@/components/ui/button'
import { useLanguage } from '@/components/language-provider'

// ============================================================
// Language Toggle Button — switches FR <-> EN
// ============================================================

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, toggle } = useLanguage()
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
      title={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
      className={`text-xs font-semibold px-2.5 h-9 ${className}`}
    >
      {lang === 'fr' ? 'EN' : 'FR'}
    </Button>
  )
}
