import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth/server'
import { getUserOutputs } from '@/lib/db/outputs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/outputs — list all saved outputs for the authenticated user */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)

    const { searchParams } = request.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10))
    const offset = (page - 1) * limit

    const { data, total } = await getUserOutputs(userId, limit, offset)

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      has_more: offset + limit < total,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[api/outputs] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
