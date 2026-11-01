import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

// ============================================================
// POST /api/prospects/import
// Bulk import prospects from CSV-like JSON array
// Body: { prospects: [{ name, email, company, title, linkedinUrl, notes, tags }] }
// Deduplication: by (email) or (linkedinUrl) or (name + company)
// ============================================================

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { prospects } = body

    if (!Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json({ success: false, error: 'Liste vide ou invalide' }, { status: 400 })
    }

    if (prospects.length > 1000) {
      return NextResponse.json({ success: false, error: 'Maximum 1000 prospects par import' }, { status: 400 })
    }

    // Normalize + validate rows
    const normalized = prospects
      .map((p: any) => ({
        name: String(p.name || '').trim(),
        email: p.email ? String(p.email).trim().toLowerCase() : null,
        company: p.company ? String(p.company).trim() : null,
        title: p.title ? String(p.title).trim() : null,
        linkedinUrl: p.linkedinUrl ? String(p.linkedinUrl).trim() : null,
        notes: p.notes ? String(p.notes).trim() : null,
        tags: p.tags ? String(p.tags).trim() : null,
      }))
      .filter(p => p.name.length > 0)

    if (normalized.length === 0) {
      return NextResponse.json({ success: false, error: 'Aucun prospect valide (nom requis)' }, { status: 400 })
    }

    // Fetch existing prospects for deduplication
    const existing = await db.prospect.findMany({
      where: { userId },
      select: { id: true, name: true, email: true, linkedinUrl: true, company: true },
    })

    const existingEmails = new Set(existing.filter(p => p.email).map(p => p.email!.toLowerCase()))
    const existingUrls = new Set(existing.filter(p => p.linkedinUrl).map(p => p.linkedinUrl!))
    const existingNameCompany = new Set(
      existing.filter(p => p.company).map(p => `${p.name.toLowerCase()}|${p.company!.toLowerCase()}`)
    )

    const toCreate: any[] = []
    const duplicates: { name: string; reason: string }[] = []

    for (const p of normalized) {
      if (p.email && existingEmails.has(p.email)) {
        duplicates.push({ name: p.name, reason: 'email existant' })
        continue
      }
      if (p.linkedinUrl && existingUrls.has(p.linkedinUrl)) {
        duplicates.push({ name: p.name, reason: 'URL LinkedIn existante' })
        continue
      }
      if (p.company && existingNameCompany.has(`${p.name.toLowerCase()}|${p.company.toLowerCase()}`)) {
        duplicates.push({ name: p.name, reason: 'nom + entreprise existants' })
        continue
      }
      toCreate.push({ ...p, userId, stage: 'new' })
      // Add to dedup sets to handle intra-batch duplicates
      if (p.email) existingEmails.add(p.email)
      if (p.linkedinUrl) existingUrls.add(p.linkedinUrl)
      if (p.company) existingNameCompany.add(`${p.name.toLowerCase()}|${p.company.toLowerCase()}`)
    }

    let created = 0
    if (toCreate.length > 0) {
      const r = await db.prospect.createMany({ data: toCreate, skipDuplicates: true })
      created = r.count
    }

    return NextResponse.json({
      success: true,
      data: {
        created,
        duplicates: duplicates.length,
        duplicatesDetails: duplicates.slice(0, 20),
        totalReceived: normalized.length,
      },
    })
  } catch (error: any) {
    console.error('[POST /api/prospects/import]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// ============================================================
// GET /api/prospects/import  (CSV export — kept here so /api/prospects/import serves both verbs)
// Returns CSV of all user prospects
// ============================================================
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })

    const prospects = await db.prospect.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        name: true,
        email: true,
        company: true,
        title: true,
        linkedinUrl: true,
        stage: true,
        tags: true,
        notes: true,
        createdAt: true,
      },
    })

    const header = ['name', 'email', 'company', 'title', 'linkedinUrl', 'stage', 'tags', 'notes', 'createdAt']
    const escapeCsv = (v: string | null | undefined) => {
      if (v === null || v === undefined) return ''
      const s = String(v)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }

    const rows = prospects.map(p => [
      p.name, p.email, p.company, p.title, p.linkedinUrl, p.stage, p.tags, p.notes,
      p.createdAt.toISOString(),
    ].map(escapeCsv).join(','))

    const csv = [header.join(','), ...rows].join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="prospects-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/prospects/import]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
