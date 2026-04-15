import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth/server'
import { getOrCreateUserProfile, updateUserProfile, getCreditTransactions } from '@/lib/db/outputs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/auth/profile — returns profile + credit balance for the authenticated user */
export async function GET(request: NextRequest) {
  try {
    const { userId, user } = await requireAuth(request)
    const profile = await getOrCreateUserProfile(userId, user.email)
    return NextResponse.json({ profile })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[api/auth/profile GET]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** PATCH /api/auth/profile — update full_name, organisation */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)
    const body = await request.json()
    const { full_name, organisation } = body as Record<string, string>
    await updateUserProfile(userId, { full_name, organisation })
    const profile = await getOrCreateUserProfile(userId)
    return NextResponse.json({ profile })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** GET /api/auth/profile/transactions — credit history */
export async function OPTIONS(request: NextRequest) {
  // Return 200 for CORS preflight
  return new NextResponse(null, { status: 200 })
}
