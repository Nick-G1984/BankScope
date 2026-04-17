/**
 * GET  /api/regulatory-files/[itemId]  — fetch an existing regulatory file
 * POST /api/regulatory-files/[itemId]  — trigger enrichment for an item
 *
 * Auth: Bearer token required on both endpoints.
 * The enrichment pipeline (POST) is intentionally synchronous within the
 * request so the caller gets back the completed file in one round-trip.
 * For items with long enrichment times the route has a generous maxDuration.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth/server'
import { getIntelligenceItemById } from '@/lib/db/intelligence'
import {
  getRegulatoryFileByItemId,
  regulatoryFileExists,
  createRegulatoryFilePlaceholder,
  markRegulatoryFileCompleted,
  markRegulatoryFileFailed,
  deleteRegulatoryFile,
} from '@/lib/db/regulatory-files'
import { enrichRegulatoryFile } from '@/lib/ai/enrich-regulatory-file'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120   // GPT-4o enrichment can take 30-60 s

type RouteContext = { params: { itemId: string } }

// ── GET — fetch existing regulatory file ──────────────────────────────────

/**
 * GET /api/regulatory-files/[itemId]
 *
 * Returns the regulatory file for an intelligence item, or 404 if one
 * has not yet been generated. Frontend uses this to decide whether to
 * show a "Generate" button or to render the dossier.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    await requireAuth(request)

    const file = await getRegulatoryFileByItemId(params.itemId)
    if (!file) {
      return NextResponse.json(
        { error: 'No regulatory file found for this item', code: 'not_found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ regulatory_file: file })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[api/regulatory-files] GET error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── POST — trigger enrichment ──────────────────────────────────────────────

/**
 * POST /api/regulatory-files/[itemId]
 *
 * Runs the full regulatory file enrichment pipeline for an intelligence
 * item and returns the completed file.
 *
 * Body (optional):
 *   { force?: boolean }   — if true, deletes any existing file and re-enriches
 *
 * Idempotency:
 *   If a completed file already exists (and force !== true), the existing
 *   file is returned immediately without consuming AI tokens.
 *   If enrichment_status === 'in_progress', returns 409 to prevent duplicate runs.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    await requireAuth(request)

    const body = await request.json().catch(() => ({})) as { force?: boolean }
    const force = body?.force === true

    // 1. Fetch the intelligence item
    const item = await getIntelligenceItemById(params.itemId)
    if (!item) {
      return NextResponse.json(
        { error: 'Intelligence item not found' },
        { status: 404 }
      )
    }

    // 2. Check for existing file
    const existing = await getRegulatoryFileByItemId(params.itemId)

    if (existing) {
      if (existing.enrichment_status === 'in_progress') {
        return NextResponse.json(
          { error: 'Enrichment already in progress for this item', code: 'in_progress' },
          { status: 409 }
        )
      }

      if (existing.enrichment_status === 'completed' && !force) {
        // Return the existing file — no re-enrichment needed
        return NextResponse.json(
          { regulatory_file: existing, from_cache: true },
          { status: 200 }
        )
      }

      // force === true or status === 'failed' — delete and re-enrich
      await deleteRegulatoryFile(params.itemId)
    }

    // 3. Create a placeholder row to claim the item and prevent duplicate runs
    const fileId = await createRegulatoryFilePlaceholder(params.itemId, {
      source_title:       item.title,
      source_url:         item.source_url ?? null,
      source_organisation: item.source_name,
      publication_date:   item.publish_date ?? null,
      regulatory_theme:   item.regulatory_theme ?? null,
      urgency:            item.urgency ?? null,
      action_required:    item.action_required ?? null,
    })

    // 4. Run enrichment
    let enrichmentResult
    try {
      enrichmentResult = await enrichRegulatoryFile(item)
    } catch (enrichErr) {
      const errMsg = enrichErr instanceof Error ? enrichErr.message : String(enrichErr)
      await markRegulatoryFileFailed(fileId, errMsg)
      console.error('[api/regulatory-files] Enrichment failed:', errMsg)
      return NextResponse.json(
        { error: `Enrichment failed: ${errMsg}`, code: 'enrichment_failed' },
        { status: 500 }
      )
    }

    // 5. Persist the completed file
    await markRegulatoryFileCompleted(fileId, {
      source_summary:          enrichmentResult.source_summary,
      operative_points:        enrichmentResult.operative_points,
      action_triggers:         enrichmentResult.action_triggers,
      ambiguity_areas:         enrichmentResult.ambiguity_areas,
      external_commentary:     enrichmentResult.external_commentary,
      commentary_search_queries: enrichmentResult.commentary_search_queries,
      commentary_status:       enrichmentResult.commentary_status,
      synthesis:               enrichmentResult.synthesis,
      ownership:               enrichmentResult.ownership,
      likely_artefacts:        enrichmentResult.likely_artefacts,
      bankscope_view:          enrichmentResult.bankscope_view,
      enrichment_model:        enrichmentResult.enrichment_model,
    })

    // 6. Fetch and return the fully-populated record
    const completed = await getRegulatoryFileByItemId(params.itemId)
    return NextResponse.json(
      { regulatory_file: completed, from_cache: false },
      { status: 200 }
    )
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[api/regulatory-files] POST error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
