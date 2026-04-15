import { createAdminClient } from './client'
import type {
  IntelligenceItem,
  IntelligenceItemInsert,
  IntelligenceFilters,
  PaginatedResponse,
  IngestionRun,
} from '../types'

// ============================================================
// Intelligence Item Queries
// ============================================================

export async function getIntelligenceItems(
  filters: IntelligenceFilters = {}
): Promise<PaginatedResponse<IntelligenceItem>> {
  const db = createAdminClient()
  const {
    search,
    source_name,
    urgency,
    content_type,
    category_tag,
    audience,
    date_from,
    date_to,
    page = 1,
    limit = 20,
  } = filters

  const offset = (page - 1) * limit

  let query = db
    .from('intelligence_items')
    .select('*', { count: 'exact' })
    .order('publish_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Use ilike for broad search across title + summary + excerpt
  // (avoids needing a named tsvector column in Supabase)
  if (search && search.trim()) {
    const term = `%${search.trim()}%`
    query = query.or(
      `title.ilike.${term},ai_summary.ilike.${term},raw_excerpt.ilike.${term}`
    )
  }

  if (source_name) query = query.eq('source_name', source_name)
  if (urgency) query = query.eq('urgency', urgency)
  if (content_type) query = query.eq('content_type', content_type)
  if (category_tag) query = query.contains('category_tags', [category_tag])
  if (audience) query = query.contains('affected_audience', [audience])
  if (date_from) query = query.gte('publish_date', date_from)
  if (date_to) query = query.lte('publish_date', date_to)

  const { data, error, count } = await query

  if (error) throw new Error(`Failed to query intelligence items: ${error.message}`)

  const total = count ?? 0
  return {
    data: (data ?? []) as IntelligenceItem[],
    total,
    page,
    limit,
    has_more: offset + limit < total,
  }
}

export async function getIntelligenceItemById(id: string): Promise<IntelligenceItem | null> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('intelligence_items')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as IntelligenceItem
}

export async function getUnprocessedItems(limit = 50): Promise<IntelligenceItem[]> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('intelligence_items')
    .select('*')
    .eq('is_processed', false)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`Failed to fetch unprocessed items: ${error.message}`)
  return (data ?? []) as IntelligenceItem[]
}

/**
 * Fetch items for reprocessing after a prompt or schema upgrade.
 *
 * mode='missing'  → only items that were never successfully summarised
 *                   (ai_summary IS NULL or confidence_status = 'pending')
 * mode='all'      → every item, regardless of summary state
 *                   Use after a major prompt change with a sensible maxItems cap.
 *
 * Ordered oldest-first so recently ingested items aren't starved when
 * re-running with a small limit.
 */
export async function getItemsForReprocessing(options: {
  mode: 'missing' | 'all'
  maxItems?: number
  source?: string
}): Promise<IntelligenceItem[]> {
  const { mode, maxItems = 200, source } = options
  const db = createAdminClient()

  let query = db
    .from('intelligence_items')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(maxItems)

  if (mode === 'missing') {
    // Items with no successful AI summary yet
    query = query.or('ai_summary.is.null,confidence_status.eq.pending')
  }
  // mode='all' — no additional filter; all items are eligible

  if (source) {
    query = query.eq('source_name', source)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch items for reprocessing: ${error.message}`)
  return (data ?? []) as IntelligenceItem[]
}

// ============================================================
// Intelligence Item Mutations
// ============================================================

export async function upsertIntelligenceItems(
  items: IntelligenceItemInsert[]
): Promise<{ inserted: number; skipped: number }> {
  if (items.length === 0) return { inserted: 0, skipped: 0 }

  const db = createAdminClient()

  // Check which source_ids already exist to avoid duplicates
  const sourceIds = items.map((i) => i.source_id)
  const { data: existing } = await db
    .from('intelligence_items')
    .select('source_id')
    .in('source_id', sourceIds)

  const existingIds = new Set((existing ?? []).map((e: { source_id: string }) => e.source_id))
  const newItems = items.filter((i) => !existingIds.has(i.source_id))

  if (newItems.length === 0) {
    return { inserted: 0, skipped: items.length }
  }

  const { error } = await db.from('intelligence_items').insert(newItems)
  if (error) throw new Error(`Failed to insert intelligence items: ${error.message}`)

  return { inserted: newItems.length, skipped: existingIds.size }
}

export async function updateIntelligenceItemSummary(
  id: string,
  updates: {
    ai_summary: string | null
    affected_audience: string[]
    urgency: string
    suggested_next_step: string
    category_tags: string[]
    priority_score: number
    confidence_status: string
    is_processed: boolean
    // Fields added in migration-001
    action_required?: string | null
    regulatory_theme?: string | null
    deadline?: string | null
    priority_rationale?: string | null
    // Fields added in migration-002
    why_it_matters?: string | null
    affected_functions?: string[]
  }
): Promise<void> {
  const db = createAdminClient()
  const { error } = await db
    .from('intelligence_items')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(`Failed to update item ${id}: ${error.message}`)
}

// ============================================================
// Ingestion Run Tracking
// ============================================================

export async function createIngestionRun(): Promise<string> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('ingestion_runs')
    .insert({ status: 'running' })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create ingestion run: ${error.message}`)
  return data.id
}

export async function updateIngestionRun(
  id: string,
  updates: Partial<Omit<IngestionRun, 'id' | 'started_at'>>
): Promise<void> {
  const db = createAdminClient()
  const { error } = await db.from('ingestion_runs').update(updates).eq('id', id)
  if (error) throw new Error(`Failed to update ingestion run: ${error.message}`)
}

export async function getRecentIngestionRuns(limit = 10): Promise<IngestionRun[]> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('ingestion_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to fetch ingestion runs: ${error.message}`)
  return (data ?? []) as IngestionRun[]
}

// ============================================================
// Stats / Aggregates
// ============================================================

export async function getDashboardStats(): Promise<{
  total_items: number
  unprocessed: number
  today_items: number
  sources_active: number
}> {
  const db = createAdminClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [total, unprocessed, todayItems, sources] = await Promise.all([
    db.from('intelligence_items').select('*', { count: 'exact', head: true }),
    db
      .from('intelligence_items')
      .select('*', { count: 'exact', head: true })
      .eq('is_processed', false),
    db
      .from('intelligence_items')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString()),
    db
      .from('data_sources')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
  ])

  return {
    total_items: total.count ?? 0,
    unprocessed: unprocessed.count ?? 0,
    today_items: todayItems.count ?? 0,
    sources_active: sources.count ?? 0,
  }
}

// ============================================================
// Source Health Tracking
// ============================================================

export interface SourceHealthUpdate {
  success: boolean
  items_fetched: number
  items_new: number
  error_message?: string | null
}

/**
 * Update the health fields on a data_sources row after an ingestion run.
 * Increments consecutive_failures on error; resets to 0 on success.
 * Requires migration-001.sql to have been applied.
 */
export async function updateSourceHealth(
  sourceName: string,
  update: SourceHealthUpdate
): Promise<void> {
  const db = createAdminClient()
  const now = new Date().toISOString()

  const fields: Record<string, unknown> = {
    last_attempted_at: now,
    last_items_fetched: update.items_fetched,
    last_items_new: update.items_new,
  }

  if (update.success) {
    fields.last_success_at = now
    fields.last_error = null
    fields.consecutive_failures = 0
  } else {
    fields.last_error = update.error_message ?? 'Unknown error'
    // Increment consecutive_failures via a read-modify-write
    const { data: existing } = await db
      .from('data_sources')
      .select('consecutive_failures')
      .eq('name', sourceName)
      .single()
    fields.consecutive_failures = ((existing as { consecutive_failures: number } | null)?.consecutive_failures ?? 0) + 1
  }

  const { error } = await db
    .from('data_sources')
    .update(fields)
    .eq('name', sourceName)

  if (error) {
    // Non-fatal — log but don't throw so ingestion continues
    console.error(`[updateSourceHealth] Failed to update health for ${sourceName}: ${error.message}`)
  }
}

// ============================================================
// Email Signups
// ============================================================

export async function saveEmailSignup(email: string): Promise<void> {
  const db = createAdminClient()
  const { error } = await db
    .from('email_signups')
    .upsert({ email }, { onConflict: 'email' })
  if (error) throw new Error(`Failed to save email signup: ${error.message}`)
}
