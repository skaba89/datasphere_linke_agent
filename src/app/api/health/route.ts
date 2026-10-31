import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================================
// GET /api/health
// Health check Render + diagnostics complets (debug sans SSH)
//
// Retourne :
//   - status global (ok / degraded / error)
//   - database : OK / error + message
//   - env vars critiques : présentes / manquantes
//   - config : LinkedIn, Stripe, Resend, Sentry
//   - version + uptime
// ============================================================

export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, any> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    uptime: process.uptime() ? `${Math.floor(process.uptime())}s` : 'unknown',
    version: '1.0.0',
  }

  // ─── Database ───
  try {
    const result = await db.$queryRaw`SELECT 1 as ok`
    checks.database = {
      status: 'ok',
      message: 'PostgreSQL accessible',
    }
  } catch (e: any) {
    checks.database = {
      status: 'error',
      message: e.message?.slice(0, 200) || 'Unknown DB error',
    }
    checks.status = 'degraded'
  }

  // ─── Environment variables ───
  checks.envVars = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    JWT_SECRET: !!process.env.JWT_SECRET,
    DATASPHERE_AUTH_SECRET: !!process.env.DATASPHERE_AUTH_SECRET, // legacy
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET',
    RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL || 'NOT_SET',
    PORT: process.env.PORT || '10000',
    NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
    RENDER_SERVICE_NAME: process.env.RENDER_SERVICE_NAME || 'NOT_SET',
  }

  // ─── Integrations ───
  checks.integrations = {
    linkedin: {
      configured: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
      redirectUri: process.env.LINKEDIN_REDIRECT_URI ? 'SET' : 'NOT_SET',
    },
    stripe: {
      configured: !!process.env.STRIPE_SECRET_KEY,
      webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      priceProMonthly: !!process.env.STRIPE_PRICE_PRO_MONTHLY,
      priceBusinessMonthly: !!process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
    },
    resend: {
      configured: !!process.env.RESEND_API_KEY,
      fromEmail: process.env.EMAIL_FROM || process.env.FROM_EMAIL || 'NOT_SET',
    },
    sentry: {
      configured: !!process.env.SENTRY_DSN,
    },
    cron: {
      secretSet: !!process.env.CRON_SECRET,
    },
  }

  // ─── Database tables count (vérifie que les migrations sont appliquées) ───
  try {
    const userCount = await db.user.count()
    checks.database.tableCount = {
      users: userCount,
    }
    checks.database.migrations = 'OK'
  } catch (e: any) {
    checks.database.migrations = 'PENDING_OR_FAILED'
    checks.database.migrationError = e.message?.slice(0, 200)
    checks.status = 'degraded'
  }

  // ─── Response time ───
  checks.responseTimeMs = Date.now() - startTime

  // Status code : 200 si ok, 503 si degraded
  const statusCode = checks.status === 'ok' ? 200 : 503

  return NextResponse.json(checks, { status: statusCode })
}
