import { NextResponse } from 'next/server'
import { POST_TEMPLATES, getIndustries } from '@/lib/templates'

// ============================================================
// GET /api/templates
// Liste tous les templates de posts disponibles
// Query: ?industry=XXX pour filtrer par industrie
// ============================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const industry = searchParams.get('industry')

    const templates = industry
      ? POST_TEMPLATES.filter((t) => t.industry === industry)
      : POST_TEMPLATES

    const industries = getIndustries()

    return NextResponse.json({
      success: true,
      data: {
        templates,
        industries,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/templates]', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
