import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
    let settings = await db.smartPosterSettings.findFirst()
    if (!settings) {
      settings = await db.smartPosterSettings.create({ data: DEFAULTS })
    }
    return NextResponse.json({ success: true, data: settings })
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const existing = await db.smartPosterSettings.findFirst()
    if (!existing) {
      const settings = await db.smartPosterSettings.create({ data: { ...DEFAULTS, ...body } })
      return NextResponse.json({ success: true, data: settings })
    }
    const allowed = ['maxPostsPerDay','enabled','scheduleHourStart','scheduleHourEnd','timezone','autoApprove','topics','tone','language','targetAudience']
    const updateData: Record<string, any> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) updateData[key] = body[key]
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