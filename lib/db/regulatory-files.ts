/**
 * DB access layer for the regulatory_files table.
 * All writes use the admin (service-role) client — enrichment is server-only.
 * Reads can use either admin or anon client depending on context.
 */

import { createAdminClient } from './client'
import type { RegulatoryFile, RegulatoryFileInsert } from '../types/regulatory-file'

// ── Reads ──────────────────────────────────────────────────────────────────

/** Fetch the regulatory file for a given intelligence item ID, or null if none. */
export async function getRegulatoryFileByItemId(
  intelligenceItemId: string
): Promise<RegulatoryFile | null> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('regulatory_files')
    .select('*')
    .eq('intelligence_item_id', intelligenceItemId)
    .maybeSingle()

  if (error) {
    console.error('[db/regulatory-files] getRegulatoryFileByItemId error:', error.message)
    return null
  }
  return data as RegulatoryFile | null
}

/** Fetch a regulatory file by its own ID. */
export async function getRegulatoryFileById(id: string): Promise<RegulatoryFile | null> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('regulatory_files')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[db/regulatory-files] getRegulatoryFileById error:', error.message)
    return null
  }
  return data as RegulatoryFile | null
}

/** Check whether a regulatory file exists for an item (lightweight). */
export async function regulatoryFileExists(
  intelligenceItemId: string
): Promise<boolean> {
  const db = createAdminClient()
  const { data } = await db
    .from('regulatory_files')
    .select('id')
    .eq('intelligence_item_id', intelligenceItemId)
    .maybeSingle()
  return !!data
}

// ── Writes ─────────────────────────────────────────────────────────────────

/**
 * Create a new regulatory file record in 'pending' state.
 * Called at the start of enrichment to claim the row and prevent duplicate runs.
 */
export async function createRegulatoryFilePlaceholder(
  intelligenceItemId: string,
  sourceMeta: {
    source_title: string
    source_url: string | null
    source_organisation: string
    publication_date: string | null
    regulatory_theme: string | null
    urgency: string | null
    action_required: string | null
  }
): Promise<string> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('regulatory_files')
    .insert({
      intelligence_item_id: intelligenceItemId,
      enrichment_status: 'in_progress',
      ...sourceMeta,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create regulatory file placeholder: ${error.message}`)
  return data.id
}

/**
 * Upsert — used when re-enriching an existing file or creating a new one in one step.
 */
export async function upsertRegulatoryFile(
  intelligenceItemId: string,
  payload: Omit<RegulatoryFileInsert, 'intelligence_item_id'>
): Promise<RegulatoryFile> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('regulatory_files')
    .upsert(
      {
        intelligence_item_id: intelligenceItemId,
        ...payload,
      },
      { onConflict: 'intelligence_item_id' }
    )
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert regulatory file: ${error.message}`)
  return data as RegulatoryFile
}

/**
 * Mark a regulatory file as completed with the enriched content.
 */
export async function markRegulatoryFileCompleted(
  id: string,
  content: Omit<
    RegulatoryFile,
    | 'id'
    | 'intelligence_item_id'
    | 'source_title'
    | 'source_url'
    | 'source_organisation'
    | 'publication_date'
    | 'regulatory_theme'
    | 'urgency'
    | 'action_required'
    | 'enrichment_status'
    | 'enrichment_error'
    | 'created_at'
    | 'updated_at'
  >
): Promise<void> {
  const db = createAdminClient()
  const { error } = await db
    .from('regulatory_files')
    .update({
      ...content,
      enrichment_status: 'completed',
      enriched_at: new Date().toISOString(),
      enrichment_error: null,
    })
    .eq('id', id)

  if (error) throw new Error(`Failed to mark regulatory file completed: ${error.message}`)
}

/**
 * Mark a regulatory file as failed with an error message.
 */
export async function markRegulatoryFileFailed(
  id: string,
  errorMessage: string
): Promise<void> {
  const db = createAdminClient()
  await db
    .from('regulatory_files')
    .update({
      enrichment_status: 'failed',
      enrichment_error: errorMessage,
    })
    .eq('id', id)
}

/**
 * Update commentary fields after Phase 2 enrichment completes.
 * Only touches commentary-related columns — leaves Phase 1 content intact.
 */
export async function updateRegulatoryFileCommentary(
  id: string,
  commentary: {
    external_commentary: RegulatoryFile['external_commentary']
    commentary_status: RegulatoryFile['commentary_status']
    commentary_search_queries: string[]
    commentary_enriched_at: string
    commentary_rejected_candidates: unknown[]
  }
): Promise<void> {
  const db = createAdminClient()
  const { error } = await db
    .from('regulatory_files')
    .update({
      external_commentary: commentary.external_commentary,
      commentary_status: commentary.commentary_status,
      commentary_search_queries: commentary.commentary_search_queries,
      commentary_enriched_at: commentary.commentary_enriched_at,
      commentary_rejected_candidates: commentary.commentary_rejected_candidates,
    })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to update regulatory file commentary: ${error.message}`)
  }
}

/**
 * Delete a regulatory file (e.g. to allow re-enrichment from scratch).
 */
export async function deleteRegulatoryFile(
  intelligenceItemId: string
): Promise<void> {
  const db = createAdminClient()
  await db
    .from('regulatory_files')
    .delete()
    .eq('intelligence_item_id', intelligenceItemId)
}
