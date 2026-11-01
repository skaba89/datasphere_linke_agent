import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// ============================================================
// GET /api/notifications/stream
// Server-Sent Events (SSE) pour notifications temps réel
//
// Le client ouvre une connexion persistante et reçoit :
//   - Les notifications non lues au démarrage (event: initial)
//   - De nouvelles notifications toutes les 15s (event: poll)
//   - Un heartbeat toutes les 30s (event: ping)
//
// Usage côté client :
//   const es = new EventSource('/api/notifications/stream')
//   es.addEventListener('notification', (e) => {
//     const data = JSON.parse(e.data)
//     // afficher la notification
//   })
//
// Note : SSE est unidirectionnel (serveur → client), suffisant
// pour les notifications. Pas besoin de WebSocket/Socket.io.
// ============================================================

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const POLL_INTERVAL_MS = 15_000 // 15 seconds
const HEARTBEAT_INTERVAL_MS = 30_000 // 30 seconds
const MAX_CONNECTION_MS = 5 * 60_000 // 5 minutes max per connection

export async function GET(request: Request) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let lastNotificationId: string | null = null
      const startTime = Date.now()

      const send = (event: string, data: any) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        try {
          controller.enqueue(encoder.encode(payload))
        } catch {
          // Connection closed by client
        }
      }

      // Send initial unread notifications
      try {
        const unread = await db.notification.findMany({
          where: { userId, read: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, type: true, title: true, message: true, link: true, createdAt: true },
        })
        send('initial', { count: unread.length, notifications: unread })
        if (unread.length > 0) {
          lastNotificationId = unread[0].id
        }
      } catch (err) {
        logger.error({ err: (err as Error).message }, 'SSE initial fetch failed')
      }

      // Polling loop
      const pollInterval = setInterval(async () => {
        try {
          // Check connection age
          if (Date.now() - startTime > MAX_CONNECTION_MS) {
            send('close', { reason: 'max_age_reached' })
            clearInterval(pollInterval)
            clearInterval(heartbeatInterval)
            controller.close()
            return
          }

          // Fetch new notifications since lastNotificationId
          const where: any = { userId, read: false }
          if (lastNotificationId) {
            // Fetch notifications with id > lastNotificationId
            // (cuid IDs are roughly time-ordered)
            where.id = { gt: lastNotificationId }
          }

          const newNotifications = await db.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, type: true, title: true, message: true, link: true, createdAt: true },
          })

          if (newNotifications.length > 0) {
            for (const n of newNotifications) {
              send('notification', n)
            }
            // Update lastNotificationId to the most recent
            lastNotificationId = newNotifications[0].id
          }
        } catch (err) {
          logger.error({ err: (err as Error).message }, 'SSE poll failed')
        }
      }, POLL_INTERVAL_MS)

      // Heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          send('ping', { ts: Date.now() })
        } catch {
          // Connection closed
        }
      }, HEARTBEAT_INTERVAL_MS)

      // Cleanup on abort (client disconnect)
      request.signal.addEventListener('abort', () => {
        clearInterval(pollInterval)
        clearInterval(heartbeatInterval)
        try {
          controller.close()
        } catch {}
        logger.info({ userId }, 'SSE connection closed by client')
      })
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering (Render proxy)
    },
  })
}
