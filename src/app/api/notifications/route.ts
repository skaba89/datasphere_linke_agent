import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getUserNotifications, countUnreadNotifications, createNotification } from '@/lib/notifications'

// GET /api/notifications - liste + count unread
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const [notifications, unreadCount] = await Promise.all([
      getUserNotifications(userId, 20),
      countUnreadNotifications(userId),
    ])

    return NextResponse.json({ success: true, data: notifications, unreadCount })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/notifications - créer (pour tests/admin)
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const notif = await createNotification({
      userId,
      type: body.type || 'info',
      title: body.title,
      message: body.message,
      link: body.link,
    })

    return NextResponse.json({ success: true, data: notif }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
