import { ingestFCA } from './fca'
import { ingestPRA } from './pra'
import { ingestBoE } from './boe'
import { ingestICO } from './ico'
import { ingestHMT } from './hmt'
import { ingestCompaniesHouse } from './companies-house'
import { upsertIntelligenceItems, updateSourceHealth } from '../db/intelligence'
import type { RawSourceItem, SourceResult } from '../types'

type SourceFn = () => Promise<SourceResult & { items: RawSourceItem[] }>

const SOURCES: Record<string, SourceFn> = {
  FCA: ingestFCA,
  PRA: ingestPRA,
  'Bank of England': ingestBoE,
  ICO: ingestICO,
  'HM Treasury': ingestHMT,
  'Companies House': ingestCompaniesHouse,
}

export interface IngestionSummary {
  total_fetched: number
  total_new: number
  source_results: SourceResult[]
  all_errors: string[]
  duration_ms: number
}

/**
 * Run a single source function, upsert items to DB, update source health.
 * Returns a SourceResult — never throws (errors are collected).
 */
async function runSource(name: string, fn: SourceFn): Promise<SourceResult> {
  let result: SourceResult & { items: RawSourceItem[] }

  try {
    result = await fn()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const errorResult: SourceResult = {
      source_name: name,
      items_fetched: 0,
      items_new: 0,
      errors: [`[${name}] Source function threw: ${msg}`],
    }
    // Record failure in health tracking (best-effort)
    await updateSourceHealth(name, {
      success: false,
      items_fetched: 0,
      items_new: 0,
      error_message: msg,
    }).catch(() => {/* non-fatal */})
    return errorResult
  }

  let inserted = 0

  if (result.items.length > 0) {
    try {
      const dbResult = await upsertIntelligenceItems(
        result.items.map((item) => ({
          ...item,
          ai_summary: null,
          affected_audience: [],
          priority_score: null,
          urgency: null,
          category_tags: [],
          suggested_next_step: null,
          action_required: null,
          regulatory_theme: null,
          deadline: null,
          priority_rationale: null,
          confidence_status: 'pending' as const,
          is_processed: false,
        }))
      )
      inserted = dbResult.inserted
      result.items_new = inserted
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`[${name}] DB upsert error: ${msg}`)
    }
  }

  // Determine overall success: source returned items (or had none) without fatal errors
  const hasFatalErrors = result.errors.some(
    (e) => e.includes('Failed') || e.includes('threw') || e.includes('Timed out')
  )
  const success = result.items_fetched > 0 || !hasFatalErrors

  await updateSourceHealth(name, {
    success,
    items_fetched: result.items_fetched,
    items_new: inserted,
    error_message: result.errors.length > 0 ? result.errors.join(' | ') : null,
  }).catch(() => {/* non-fatal */})

  return {
    source_name: result.source_name,
    items_fetched: result.items_fetched,
    items_new: result.items_new,
    errors: result.errors,
  }
}

export async function runAllSources(): Promise<IngestionSummary> {
  const start = Date.now()
  const allErrors: string[] = []
  let total_fetched = 0
  let total_new = 0

  // Run all sources concurrently — each is isolated
  const results = await Promise.allSettled(
    Object.entries(SOURCES).map(([name, fn]) => runSource(name, fn))
  )

  const sourceResults: SourceResult[] = []

  for (const settled of results) {
    if (settled.status === 'rejected') {
      allErrors.push(`Unexpected orchestrator error: ${settled.reason}`)
      continue
    }

    const r = settled.value
    total_fetched += r.items_fetched
    total_new += r.items_new
    sourceResults.push(r)
    allErrors.push(...r.errors)
  }

  return {
    total_fetched,
    total_new,
    source_results: sourceResults,
    all_errors: allErrors,
    duration_ms: Date.now() - start,
  }
}

export async function runSingleSource(sourceName: string): Promise<IngestionSummary> {
  const fn = SOURCES[sourceName]
  if (!fn) {
    throw new Error(`Unknown source: ${sourceName}. Available: ${Object.keys(SOURCES).join(', ')}`)
  }

  const start = Date.now()
  const result = await runSource(sourceName, fn)

  return {
    total_fetched: result.items_fetched,
    total_new: result.items_new,
    source_results: [result],
    all_errors: result.errors,
    duration_ms: Date.now() - start,
  }
}

export const AVAILABLE_SOURCES = Object.keys(SOURCES)
