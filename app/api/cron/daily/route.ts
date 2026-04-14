import { NextRequest, NextResponse } from 'next/server'
import { createIngestionRun, updateIngestionRun } from '@/lib/db/intelligence'
import { runAllSources } from '@/lib/sources'
import { processUnprocessedItems } from '@/lib/ai/summarise'

export const runtime = 'nodejs'
export const maxDuration = 300

// This endpoint is called by Vercel Cron at 06:00 UTC daily
// Vercel sets the Authorization: Bearer <CRON_SECRET> header automatically
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/daily] CRON_SECRET not set')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[cron/daily] Unauthorised cron attempt')
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  console.log('[cron/daily] Starting daily ingestion run')
  const runId = await createIngestionRun()

  try {
    // Step 1: Ingest all sources
    const ingestionSummary = await runAllSources()
    console.log(`[cron/daily] Ingestion complete: ${ingestionSummary.total_new} new items`)

    // Step 2: AI summarise all unprocessed items (up to 50 per run)
    const summarisationResult = await processUnprocessedItems(50)
    console.log(`[cron/daily] Summarisation complete: ${summarisationResult.processed} processed`)

    await updateIngestionRun(runId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      items_fetched: ingestionSummary.total_fetched,
      items_new: ingestionSummary.total_new,
      items_processed: summarisationResult.processed,
      error_log:
        [...ingestionSummary.all_errors, ...summarisationResult.errors].join('\n') || null,
      source_results: ingestionSummary.source_results,
    })

    return NextResponse.json({
      success: true,
      run_id: runId,
      ingestion: {
        total_fetched: ingestionSummary.total_fetched,
        total_new: ingestionSummary.total_new,
      },
      summarisation: {
        processed: summarisationResult.processed,
        failed: summarisationResult.failed,
      },
      errors: [...ingestionSummary.all_errors, ...summarisationResult.errors],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cron job failed'
    console.error('[cron/daily] Fatal error:', message)

    await updateIngestionRun(runId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_log: message,
    }).catch(() => {})

    return NextResponse.json({ error: message, run_id: runId }, { status: 500 })
  }
}
