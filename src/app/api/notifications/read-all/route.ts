import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { markAllAsRead } from '@/lib/notifications'

export async function POST() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    await markAllAsRead(userId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
