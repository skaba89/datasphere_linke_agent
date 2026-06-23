import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    let metrics = await db.engagementMetric.findMany({
      orderBy: { date: 'asc' },
    })

    if (metrics.length === 0) {
      // Seed 14 days of metrics one by one (SQLite compatible)
      for (let i = 13; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        await db.engagementMetric.create({
          data: {
            date: dateStr,
            likes: Math.floor(50 + Math.random() * 300 + (13 - i) * 10),
            comments: Math.floor(10 + Math.random() * 80 + (13 - i) * 3),
            shares: Math.floor(5 + Math.random() * 40 + (13 - i) * 2),
            views: Math.floor(2000 + Math.random() * 8000 + (13 - i) * 200),
            clicks: Math.floor(20 + Math.random() * 150 + (13 - i) * 5),
          },
        })
      }
      metrics = await db.engagementMetric.findMany({ orderBy: { date: 'asc' } })
    }

    return NextResponse.json({ success: true, data: metrics })
  } catch (error: any) {
    console.error('[METRICS ERROR]', error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}