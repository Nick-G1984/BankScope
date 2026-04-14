import { NextRequest, NextResponse } from 'next/server'
import { processUnprocessedItems, summariseSingleItem } from '@/lib/ai/summarise'

export const runtime = 'nodejs'
export const maxDuration = 300

function isAuthorised(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) return false
  const authHeader = request.headers.get('authorization')
  const querySecret = request.nextUrl.searchParams.get('secret')
  return (
    authHeader === `Bearer ${adminSecret}` ||
    querySecret === adminSecret
  )
}

export async function POST(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let body: { item_id?: string; batch_size?: number } = {}
  try {
    body = await request.json()
  } catch {
    // Optional body
  }

  try {
    if (body.item_id) {
      // Summarise a single specific item
      const summary = await summariseSingleItem(body.item_id)
      return NextResponse.json({ success: true, summary })
    } else {
      // Process batch of unprocessed items
      const batchSize = body.batch_size ?? 20
      const result = await processUnprocessedItems(batchSize)
      return NextResponse.json({ success: true, ...result })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Summarisation failed'
    console.error('[api/summarise] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
