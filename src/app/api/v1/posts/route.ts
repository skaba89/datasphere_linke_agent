import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyApiKey } from '@/lib/api-keys'
import { applyRateLimit, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit'

// ============================================================
// GET /api/v1/posts
// API PUBLIQUE - Liste les propositions de l'utilisateur
//
// Headers requis :
//   Authorization: Bearer dsk_live_XXX
//
// Query params :
//   ?status=pending|approved|published|rejected
//   ?limit=20 (max 100)
//   ?offset=0
//
// Plan requis : Business
// ============================================================
export async function GET(request: Request) {
  try {
    // 1. Authentification par clé API
    const authHeader = request.headers.get('authorization')
    const auth = await verifyApiKey(authHeader)
    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: 'API key invalide ou manquante. Incluez "Authorization: Bearer dsk_live_XXX".',
        },
        { status: 401 }
      )
    }

    // 2. Rate limiting API publique : 60 req / min / user
    const rl = applyRateLimit(request, 'api-v1', { limit: 60, windowMs: 60 * 1000 }, auth.userId)
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded (60 req/min)' },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders(rl),
            'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    // 3. Parse query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const validStatuses = ['pending', 'approved', 'published', 'rejected', 'failed']
    const where: any = { userId: auth.userId }
    if (status && validStatuses.includes(status)) {
      where.status = status
    }

    const [posts, total] = await Promise.all([
      db.postProposal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.postProposal.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: posts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + posts.length < total,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/v1/posts]', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// ============================================================
// POST /api/v1/posts
// API PUBLIQUE - Crée une nouvelle proposition (texte fourni par l'appelant)
//
// Body: { title, content, hashtags?, format?, angle? }
// ============================================================
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const auth = await verifyApiKey(authHeader)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'API key invalide ou manquante' },
        { status: 401 }
      )
    }

    const rl = applyRateLimit(request, 'api-v1', { limit: 60, windowMs: 60 * 1000 }, auth.userId)
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders(rl) }
      )
    }

    const body = await request.json()
    if (!body.title || !body.content) {
      return NextResponse.json(
        { success: false, error: 'Champs requis: title, content' },
        { status: 400 }
      )
    }

    const proposal = await db.postProposal.create({
      data: {
        userId: auth.userId,
        title: String(body.title).slice(0, 200),
        content: String(body.content).slice(0, 5000),
        hashtags: body.hashtags || '',
        format: body.format || 'text',
        angle: body.angle || 'api',
        targetAudience: body.targetAudience || '',
        qualityScore: typeof body.qualityScore === 'number' ? body.qualityScore : 0,
        optimalTime: body.optimalTime || '',
        engagementEst: body.engagementEst || '',
        status: 'pending',
      },
    })

    return NextResponse.json({
      success: true,
      data: proposal,
    }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/v1/posts]', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
