'use client'

import { useEffect, useState, useCallback } from 'react'

// ============================================================
// useNotifications SSE Hook
//
// Hook React pour se connecter au stream SSE de notifications
// et recevoir les notifications en temps réel.
//
// Usage :
//   const { unreadCount, notifications, markAsRead } = useNotificationsStream()
// ============================================================

export type Notification = {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  createdAt: string
}

export function useNotificationsStream() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return

    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      try {
        es = new EventSource('/api/notifications/stream')

        es.addEventListener('open', () => {
          setConnected(true)
        })

        es.addEventListener('initial', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data)
            if (data.notifications) {
              setNotifications(data.notifications)
            }
          } catch {}
        })

        es.addEventListener('notification', (e: MessageEvent) => {
          try {
            const notif: Notification = JSON.parse(e.data)
            setNotifications(prev => {
              // Avoid duplicates
              if (prev.find(n => n.id === notif.id)) return prev
              return [notif, ...prev].slice(0, 20) // keep max 20
            })

            // Browser notification (if permitted)
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              try {
                new Notification(notif.title, {
                  body: notif.message,
                  tag: notif.id,
                })
              } catch {}
            }
          } catch {}
        })

        es.addEventListener('ping', () => {
          // Heartbeat received, connection is alive
        })

        es.addEventListener('close', () => {
          setConnected(false)
          es?.close()
          // Reconnect after 5s
          reconnectTimer = setTimeout(connect, 5000)
        })

        es.onerror = () => {
          setConnected(false)
          es?.close()
          // Reconnect after 5s
          reconnectTimer = setTimeout(connect, 5000)
        }
      } catch {
        // EventSource not supported or other error
        reconnectTimer = setTimeout(connect, 10000)
      }
    }

    connect()

    return () => {
      es?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch {}
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' })
      setNotifications([])
    } catch {}
  }, [])

  const unreadCount = notifications.length

  return {
    notifications,
    unreadCount,
    connected,
    markAsRead,
    markAllAsRead,
  }
}
