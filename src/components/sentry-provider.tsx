'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// ============================================================
// SentryProvider
// - Charge le user context Sentry au mount
// - Suit les changements de route pour le breadcrumb
// ============================================================

export function SentryProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Breadcrumb automatique sur navigation
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: `Navigated to ${pathname}`,
        level: 'info',
      })
    }
  }, [pathname])

  return <>{children}</>
}
