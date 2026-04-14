import { ingestFCA } from './fca'
import { ingestPRA } from './pra'
import { ingestBoE } from './boe'
import { ingestICO } from './ico'
import { ingestHMT } from './hmt'
import { ingestCompaniesHouse } from './companies-house'
import { upsertIntelligenceItems } from '../db/intelligence'
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

export async function runAllSources(): Promise<IngestionSummary> {
  const start = Date.now()
  const sourceResults: SourceResult[] = []
  const allErrors: string[] = []
  let total_fetched = 0
  let total_new = 0

  // Run all sources concurrently with error isolation
  const results = await Promise.allSettled(
    Object.entries(SOURCES).map(async ([name, fn]) => {
      const result = await fn()
      return { name, result }
    })
  )

  for (const settled of results) {
    if (settled.status === 'rejected') {
      allErrors.push(`Source runner error: ${settled.reason}`)
      continue
    }

    const { result } = settled.value

    if (result.items.length > 0) {
      try {
        const { inserted, skipped } = await upsertIntelligenceItems(
          result.items.map((item) => ({
            ...item,
            ai_summary: null,
            affected_audience: [],
            priority_score: null,
            urgency: null,
            category_tags: [],
            suggested_next_step: null,
            confidence_status: 'pending' as const,
            is_processed: false,
          }))
        )
        result.items_new = inserted
        total_fetched += result.items_fetched
        total_new += inserted
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        allErrors.push(`DB upsert error for ${result.source_name}: ${msg}`)
      }
    }

    sourceResults.push({
      source_name: result.source_name,
      items_fetched: result.items_fetched,
      items_new: result.items_new,
      errors: result.errors,
    })

    allErrors.push(...result.errors)
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
  const result = await fn()
  let total_new = 0

  if (result.items.length > 0) {
    const { inserted } = await upsertIntelligenceItems(
      result.items.map((item) => ({
        ...item,
        ai_summary: null,
        affected_audience: [],
        priority_score: null,
        urgency: null,
        category_tags: [],
        suggested_next_step: null,
        confidence_status: 'pending' as const,
        is_processed: false,
      }))
    )
    result.items_new = inserted
    total_new = inserted
  }

  return {
    total_fetched: result.items_fetched,
    total_new,
    source_results: [{
      source_name: result.source_name,
      items_fetched: result.items_fetched,
      items_new: result.items_new,
      errors: result.errors,
    }],
    all_errors: result.errors,
    duration_ms: Date.now() - start,
  }
}

export const AVAILABLE_SOURCES = Object.keys(SOURCES)
