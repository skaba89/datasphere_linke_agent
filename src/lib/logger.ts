import pino from 'pino'

// ============================================================
// Logger structuré (pino)
//
// - En production : logs JSON pour Render / Sentry
// - En dev : logs colorés lisibles
// - Niveaux : debug, info, warn, error, fatal
//
// Usage :
//   import { logger } from '@/lib/logger'
//   logger.info({ userId }, 'User registered')
//   logger.error({ err, userId }, 'Publish failed')
// ============================================================

const isDev = process.env.NODE_ENV !== 'production'

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  base: {
    service: 'datasphere',
    env: process.env.NODE_ENV || 'development',
  },
  ...(isDev
    ? {
        // Dev : logs colorés et lisibles
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname,service,env',
          },
        },
      }
    : {
        // Prod : JSON structuré ( Render / Sentry / Datadog compatible)
        formatters: {
          level: (label) => ({ level: label }),
          time: (ts) => ({ time: new Date(ts).toISOString() }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
})

export { logger }

// ============================================================
// Helpers de log contextuels (avec userId automatique)
// ============================================================
export function logWithContext(context: Record<string, any>, msg: string, level: 'info' | 'warn' | 'error' = 'info') {
  logger[level](context, msg)
}

export function logError(err: Error, context: Record<string, any> = {}, msg = 'Error') {
  logger.error({ err: { message: err.message, stack: err.stack, name: err.name }, ...context }, msg)
}

export function logApiRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number,
  userId?: string,
  error?: string
) {
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
  logger[level]({
    method,
    path,
    status,
    durationMs,
    userId: userId || null,
    error: error || null,
  }, `${method} ${path} ${status} ${durationMs}ms`)
}
