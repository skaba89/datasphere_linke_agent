import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Health check pour Render (et tout monitoring)
// Render attend un 200 sur /api/health
export async function GET() {
  const checks: Record<string, any> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    demo: process.env.DEMO_MODE === 'true',
  }

  // Vérifier la connexion DB
  try {
    await db.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch (e: any) {
    checks.database = 'error'
    checks.dbError = e.message
    return NextResponse.json(
      { ...checks, status: 'degraded' },
      { status: 503 }
    )
  }

  return NextResponse.json(checks)
}
