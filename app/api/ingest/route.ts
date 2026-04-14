import { NextRequest, NextResponse } from 'next/server'
import { createIngestionRun, updateIngestionRun } from '@/lib/db/intelligence'
import { runAllSources, runSingleSource } from '@/lib/sources'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

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

  let body: { source?: string } = {}
  try {
    body = await request.json()
  } catch {
    // Body is optional
  }

  const runId = await createIngestionRun()

  try {
    const summary = body.source
      ? await runSingleSource(body.source)
      : await runAllSources()

    await updateIngestionRun(runId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      items_fetched: summary.total_fetched,
      items_new: summary.total_new,
      error_log: summary.all_errors.length > 0 ? summary.all_errors.join('\n') : null,
      source_results: summary.source_results,
    })

    return NextResponse.json({
      success: true,
      run_id: runId,
      total_fetched: summary.total_fetched,
      total_new: summary.total_new,
      duration_ms: summary.duration_ms,
      source_results: summary.source_results,
      errors: summary.all_errors,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingestion failed'

    await updateIngestionRun(runId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_log: message,
    }).catch(() => {})

    console.error('[api/ingest] Error:', message)
    return NextResponse.json({ error: message, run_id: runId }, { status: 500 })
  }
}
