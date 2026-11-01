import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { decodeCursor, normalizeLimit, buildPaginationResult } from '@/lib/pagination'

// ============================================================
// GET /api/prospects
// Liste les prospects avec cursor-based pagination
//
// Query params:
//   - limit (défaut 50, max 100)
//   - cursor (curseur page précédente)
//   - stage (filtre par stage)
// ============================================================
export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = normalizeLimit(parseInt(searchParams.get('limit') || '50'))
    const cursor = searchParams.get('cursor') || undefined
    const stage = searchParams.get('stage') || undefined

    const cursorId = cursor ? decodeCursor(cursor) : null
    if (cursor && !cursorId) {
      return NextResponse.json({ success: false, error: 'Curseur invalide (format incorrect)' }, { status: 400 })
    }
    let cursorItem: { id: string; createdAt: Date } | null = null
    if (cursorId) {
      cursorItem = await db.prospect.findUnique({
        where: { id: cursorId },
        select: { id: true, createdAt: true },
      })
      if (!cursorItem) {
        return NextResponse.json({ success: false, error: 'Curseur invalide ou expiré' }, { status: 400 })
      }
    }

    const where: any = { userId }
    if (stage) where.stage = stage
    if (cursorItem) {
      where.OR = [
        { createdAt: { lt: cursorItem.createdAt } },
        { createdAt: cursorItem.createdAt, id: { lt: cursorItem.id } },
      ]
    }

    const prospects = await db.prospect.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: { messages: { select: { id: true, status: true, subject: true } } },
    })

    const result = buildPaginationResult(prospects, limit)

    return NextResponse.json({
      success: true,
      data: result.data,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    const body = await request.json()
    if (!body.name) return NextResponse.json({ success: false, error: 'Nom requis' }, { status: 400 })
    const prospect = await db.prospect.create({ data: { userId, name: body.name, linkedinUrl: body.linkedinUrl || null, email: body.email || null, company: body.company || null, title: body.title || null, notes: body.notes || null, tags: body.tags || null, stage: body.stage || 'new' } })
    return NextResponse.json({ success: true, data: prospect }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
