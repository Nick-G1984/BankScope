/**
 * POST /api/regulatory-files/[itemId]/commentary
 *
 * Triggers Phase 2 commentary enrichment for a regulatory file.
 * Separate from the main enrichment endpoint so commentary can be
 * triggered independently (user-initiated, scheduled, or after Phase 1).
 *
 * Prerequisites:
 *   - A completed regulatory file must already exist (Phase 1 done)
 *   - A search API (TAVILY_API_KEY or BING_SEARCH_API_KEY) must be set
 *
 * Body (all optional):
 *   {
 *     force?: boolean    — re-run even if commentary already exists (default: false)
 *   }
 *
 * Responses:
 *   200 — commentary enrichment complete (may be 0 results — see commentary_status)
 *   400 — no regulatory file exists yet, or item not found
 *   409 — commentary enrichment already in progress (future: async jobs)
 *   422 — item not eligible (urgency/priority criteria not met) unless force=true
 *   503 — no search API configured
 *   500 — enrichment failed
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth/server'
import { getIntelligenceItemById } from '@/lib/db/intelligence'
import { getRegulatoryFileByItemId, updateRegulatoryFileCommentary } from '@/lib/db/regulatory-files'
import {
  enrichCommentary,
  isEnrichmentError,
  isEligibleForCommentaryEnrichment,
} from '@/lib/commentary/enrich-commentary'
import { getSearchBackend } from '@/lib/commentary/search-commentary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120  // Commentary enrichment can take 60-90s

type RouteContext = { params: { itemId: string } }

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    await requireAuth(request)

    const body = (await request.json().catch(() => ({}))) as { force?: boolean }
    const force = body?.force === true

    // 1. Search backend must be configured before we do anything else
    const backend = getSearchBackend()
    if (!backend) {
      return NextResponse.json(
        {
          error: 'Commentary enrichment requires a search API. Set TAVILY_API_KEY or BING_SEARCH_API_KEY.',
          code: 'search_not_configured',
        },
        { status: 503 }
      )
    }

    // 2. Fetch the intelligence item
    const item = await getIntelligenceItemById(params.itemId)
    if (!item) {
      return NextResponse.json({ error: 'Intelligence item not found' }, { status: 404 })
    }

    // 3. Phase 1 must be complete first
    const regFile = await getRegulatoryFileByItemId(params.itemId)
    if (!regFile) {
      return NextResponse.json(
        {
          error: 'No regulatory file found for this item. Run Phase 1 enrichment first.',
          code: 'phase1_required',
        },
        { status: 400 }
      )
    }
    if (regFile.enrichment_status !== 'completed') {
      return NextResponse.json(
        {
          error: `Phase 1 enrichment status is "${regFile.enrichment_status}" — must be "completed" before running commentary.`,
          code: 'phase1_not_complete',
        },
        { status: 400 }
      )
    }

    // 4. If commentary already exists and not forcing, return cached
    if (!force && regFile.commentary_status === 'complete' && regFile.external_commentary?.length > 0) {
      return NextResponse.json(
        {
          from_cache: true,
          commentary_status: 'complete',
          commentary_count: regFile.external_commentary.length,
          commentary: regFile.external_commentary,
        },
        { status: 200 }
      )
    }

    // 5. Eligibility check — can be bypassed with force=true
    if (!force && !isEligibleForCommentaryEnrichment(item)) {
      return NextResponse.json(
        {
          error:
            'This item does not meet commentary enrichment eligibility criteria ' +
            '(urgency, priority score, content type). Pass force: true to override.',
          code: 'not_eligible',
          urgency: item.urgency,
          priority_score: item.priority_score,
          content_type: item.content_type,
        },
        { status: 422 }
      )
    }

    // 6. Run commentary enrichment
    const result = await enrichCommentary(item, { forceEligible: true })

    if (isEnrichmentError(result)) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: result.code === 'search_not_configured' ? 503 : 500 }
      )
    }

    // 7. Persist results
    await updateRegulatoryFileCommentary(regFile.id, {
      external_commentary: result.commentary,
      commentary_status: result.commentary_status,
      commentary_search_queries: result.queries_run,
      commentary_enriched_at: new Date().toISOString(),
      commentary_rejected_candidates: result.rejected_candidates,
    })

    return NextResponse.json(
      {
        from_cache: false,
        commentary_status: result.commentary_status,
        commentary_count: result.commentary.length,
        commentary: result.commentary,
        search_backend: result.search_backend,
        total_candidates_evaluated: result.total_candidates_evaluated,
        total_accepted: result.total_accepted,
        total_rejected: result.total_rejected,
        queries_run_count: result.queries_run.length,
        enrichment_duration_ms: result.enrichment_duration_ms,
      },
      { status: 200 }
    )
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[api/regulatory-files/commentary] POST error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
