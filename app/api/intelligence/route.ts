import { NextRequest, NextResponse } from 'next/server'
import { getIntelligenceItems } from '@/lib/db/intelligence'
import type { IntelligenceFilters, Urgency, ContentType } from '@/lib/types'

export const runtime = 'nodejs'
export const revalidate = 60 // Cache for 60 seconds

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    // Multi-value params arrive as repeated keys: ?firm_type=banks&firm_type=building+societies
    const firm_types = searchParams.getAll('firm_type')
    const product_areas = searchParams.getAll('product_area')
    const functions = searchParams.getAll('function')

    const filters: IntelligenceFilters = {
      search: searchParams.get('search') || undefined,
      source_name: searchParams.get('source_name') || undefined,
      urgency: (searchParams.get('urgency') as Urgency) || undefined,
      content_type: (searchParams.get('content_type') as ContentType) || undefined,
      category_tag: searchParams.get('category_tag') || undefined,
      audience: searchParams.get('audience') || undefined,
      firm_types: firm_types.length > 0 ? firm_types : undefined,
      product_areas: product_areas.length > 0 ? product_areas : undefined,
      functions: functions.length > 0 ? functions : undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      page: searchParams.has('page') ? parseInt(searchParams.get('page')!, 10) : 1,
      limit: searchParams.has('limit') ? Math.min(parseInt(searchParams.get('limit')!, 10), 100) : 20,
    }

    const result = await getIntelligenceItems(filters)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[api/intelligence] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
