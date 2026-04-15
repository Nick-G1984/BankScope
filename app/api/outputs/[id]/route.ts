import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth/server'
import { getOutputById } from '@/lib/db/outputs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/outputs/[id] — fetch a single saved output for the authenticated user */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await requireAuth(request)
    const output = await getOutputById(params.id, userId)

    if (!output) {
      return NextResponse.json({ error: 'Output not found' }, { status: 404 })
    }

    return NextResponse.json({ output })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
