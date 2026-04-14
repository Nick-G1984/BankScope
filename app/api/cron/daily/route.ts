import { NextRequest, NextResponse } from 'next/server'
import {
  createIngestionRun,
  updateIngestionRun,
  getRecentIngestionRuns,
} from '@/lib/db/intelligence'
import { runAllSources } from '@/lib/sources'
import { processUnprocessedItems } from '@/lib/ai/summarise'

export const runtime = 'nodejs'
// Vercel Pro max function duration. Free tier cap is 60s — adjust if needed.
export const maxDuration = 300

/**
 * Daily ingestion cron — called by Vercel Cron at 06:00 UTC.
 * Vercel automatically sets: Authorization: Bearer <CRON_SECRET>
 *
 * Improvements over v1:
 * - Duplicate run prevention: aborts if a run started within the last 10 minutes
 * - Orphan cleanup: marks stale 'running' runs as 'failed' before starting
 * - Full summarisation: processes all unprocessed items (no 50-item cap)
 * - Structured per-step timing in response
 */
export async function GET(request: NextRequest) {
  const runStart = Date.now()

  // ── Auth ──────────────────────────────────────────────────────────────
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

  // ── Duplicate run prevention ───────────────────────────────────────────
  // Check if a run started in the last 10 minutes is still 'running'
  const recentRuns = await getRecentIngestionRuns(5).catch(() => [])
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  const stuckRun = recentRuns.find(
    (r) => r.status === 'running' && r.started_at > tenMinutesAgo
  )
  if (stuckRun) {
    console.warn(`[cron/daily] Run ${stuckRun.id} is already running (started ${stuckRun.started_at}) — aborting duplicate`)
    return NextResponse.json({
      skipped: true,
      reason: 'A run started within the last 10 minutes is still in progress',
      active_run_id: stuckRun.id,
    }, { status: 200 })
  }

  // ── Orphan cleanup ────────────────────────────────────────────────────
  // Mark old 'running' runs as 'failed' (they must have crashed without cleanup)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  for (const run of recentRuns) {
    if (run.status === 'running' && run.started_at < oneHourAgo) {
      console.warn(`[cron/daily] Marking orphaned run ${run.id} as failed`)
      await updateIngestionRun(run.id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_log: 'Marked failed by subsequent cron run — previous run did not complete cleanly',
      }).catch(() => {})
    }
  }

  // ── Create run record ─────────────────────────────────────────────────
  console.log('[cron/daily] Starting daily ingestion run')
  const runId = await createIngestionRun()

  try {
    // ── Step 1: Ingest all sources ──────────────────────────────────────
    const ingestStart = Date.now()
    const ingestionSummary = await runAllSources()
    const ingestMs = Date.now() - ingestStart

    console.log(
      `[cron/daily] Ingestion complete in ${ingestMs}ms: ` +
      `fetched=${ingestionSummary.total_fetched} new=${ingestionSummary.total_new} ` +
      `errors=${ingestionSummary.all_errors.length}`
    )

    // Per-source log for visibility
    for (const sr of ingestionSummary.source_results) {
      const status = sr.errors.length > 0 ? '⚠' : '✓'
      console.log(`  ${status} ${sr.source_name}: fetched=${sr.items_fetched} new=${sr.items_new} errors=${sr.errors.length}`)
    }

    // ── Step 2: AI summarise ALL unprocessed items ──────────────────────
    // Budget: leave ~30s of headroom within the maxDuration window
    const remainingMs = maxDuration * 1000 - (Date.now() - runStart) - 30_000
    const summariseStart = Date.now()
    const summarisationResult = await processUnprocessedItems({
      maxItems: 200,       // generous cap — will be limited by timeBudgetMs in practice
      timeBudgetMs: Math.max(remainingMs, 60_000), // at least 1 min even if budget is tight
    })
    const summariseMs = Date.now() - summariseStart

    console.log(
      `[cron/daily] Summarisation complete in ${summariseMs}ms: ` +
      `processed=${summarisationResult.processed} failed=${summarisationResult.failed}`
    )

    // ── Finalise run record ─────────────────────────────────────────────
    const allErrors = [...ingestionSummary.all_errors, ...summarisationResult.errors]

    await updateIngestionRun(runId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      items_fetched: ingestionSummary.total_fetched,
      items_new: ingestionSummary.total_new,
      items_processed: summarisationResult.processed,
      error_log: allErrors.length > 0 ? allErrors.slice(0, 50).join('\n') : null,
      source_results: ingestionSummary.source_results,
    })

    return NextResponse.json({
      success: true,
      run_id: runId,
      duration_ms: Date.now() - runStart,
      ingestion: {
        total_fetched: ingestionSummary.total_fetched,
        total_new: ingestionSummary.total_new,
        duration_ms: ingestMs,
        sources: ingestionSummary.source_results.map((s) => ({
          name: s.source_name,
          fetched: s.items_fetched,
          new: s.items_new,
          errors: s.errors.length,
        })),
      },
      summarisation: {
        processed: summarisationResult.processed,
        failed: summarisationResult.failed,
        duration_ms: summariseMs,
      },
      errors: allErrors.slice(0, 20), // cap response payload
      has_more_errors: allErrors.length > 20,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cron job failed with unknown error'
    console.error('[cron/daily] Fatal error:', message)

    await updateIngestionRun(runId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_log: message,
    }).catch(() => {})

    return NextResponse.json(
      { error: message, run_id: runId, duration_ms: Date.now() - runStart },
      { status: 500 }
    )
  }
}
