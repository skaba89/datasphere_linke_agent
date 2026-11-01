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

    // ⭐ Dedup check (B4 fix — same 3-key logic as import route)
    const email = body.email ? String(body.email).trim().toLowerCase() : null
    const linkedinUrl = body.linkedinUrl ? String(body.linkedinUrl).trim() : null
    const name = String(body.name).trim()
    const company = body.company ? String(body.company).trim() : null

    const dedupWhere: any[] = [{ name: { equals: name, mode: 'insensitive' } }]
    if (email) dedupWhere.push({ email })
    if (linkedinUrl) dedupWhere.push({ linkedinUrl })
    if (company) dedupWhere.push({ name: { equals: name, mode: 'insensitive' }, company: { equals: company, mode: 'insensitive' } })

    const existing = await db.prospect.findFirst({
      where: { userId, OR: dedupWhere },
      select: { id: true, name: true, email: true, linkedinUrl: true },
    })

    if (existing) {
      let reason = 'nom similaire'
      if (email && existing.email === email) reason = 'email existant'
      else if (linkedinUrl && existing.linkedinUrl === linkedinUrl) reason = 'URL LinkedIn existante'
      else if (company) reason = 'nom + entreprise existants'

      return NextResponse.json({
        success: false,
        error: `Doublon détecté (${reason}): ${existing.name}`,
        duplicateId: existing.id,
        duplicate: existing,
      }, { status: 409 })
    }

    const prospect = await db.prospect.create({
      data: {
        userId,
        name,
        linkedinUrl: linkedinUrl || null,
        email: email || null,
        company: company || null,
        title: body.title || null,
        notes: body.notes || null,
        tags: body.tags || null,
        stage: body.stage || 'new',
      },
    })

    // Score the new prospect
    try {
      // Import inline to avoid circular dependency
      const { scoreProspect } = await import('@/lib/prospect-scoring')
      await scoreProspect(prospect.id)
    } catch {
      // Scoring failure should not block creation
    }

    return NextResponse.json({ success: true, data: prospect }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
