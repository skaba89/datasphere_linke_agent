import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

const DEFAULTS = {
  maxPostsPerDay: 3,
  enabled: true,
  scheduleHourStart: 8,
  scheduleHourEnd: 19,
  timezone: 'Europe/Paris',
  autoApprove: false,
  topics: 'IA, tech, marketing digital, entrepreneurship',
  tone: 'Professionnel',
  language: 'fr',
  targetAudience: 'entrepreneurs, CTO, managers tech',
}

export async function GET() {
  try {
    const userId = await getCurrentUserId()

    // Mode démo (non authentifié) -> settings globaux legacy
    if (!userId) {
      let settings = await db.smartPosterSettings.findFirst({
        where: { userId: null as any },
      })
      if (!settings) {
        // Fallback: premier settings (legacy) ou création
        settings = await db.smartPosterSettings.create({
          data: DEFAULTS as any,
        })
      }
      return NextResponse.json({ success: true, data: settings })
    }

    let settings = await db.smartPosterSettings.findUnique({ where: { userId } })
    if (!settings) {
      settings = await db.smartPosterSettings.create({
        data: { userId, ...DEFAULTS },
      })
    }
    return NextResponse.json({ success: true, data: settings })
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const existing = await db.smartPosterSettings.findUnique({ where: { userId } })

    const allowed = ['maxPostsPerDay','enabled','scheduleHourStart','scheduleHourEnd','timezone','autoApprove','topics','tone','language','targetAudience']
    const updateData: Record<string, any> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) updateData[key] = body[key]
    }

    if (!existing) {
      const settings = await db.smartPosterSettings.create({
        data: { userId, ...DEFAULTS, ...updateData },
      })
      return NextResponse.json({ success: true, data: settings })
    }

    const settings = await db.smartPosterSettings.update({
      where: { id: existing.id },
      data: updateData,
    })
    return NextResponse.json({ success: true, data: settings })
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
