import OpenAI from 'openai'
import { z } from 'zod'
import { SYSTEM_PROMPT, buildSummarisePrompt } from './prompts'
import {
  getUnprocessedItems,
  getItemsForReprocessing,
  updateIntelligenceItemSummary,
} from '../db/intelligence'
import type { AISummaryOutput, IntelligenceItem } from '../types'

// ── Zod schema ────────────────────────────────────────────────────────────
// Validates the full JSON output from the improved prompt.
// The prompt uses "affected_firm_types" as the JSON key to be more readable;
// we normalise it to "affected_audience" here so the DB field name stays stable.
const AISummarySchema = z.object({
  summary: z.string().min(10).max(3000),
  why_it_matters: z.string().min(5).max(1000),
  // The prompt calls this "affected_firm_types" for clarity; accept both names
  affected_firm_types: z.array(z.string()).min(0).max(20).optional(),
  affected_audience: z.array(z.string()).min(0).max(20).optional(),
  affected_functions: z.array(z.string()).min(0).max(20).default([]),
  urgency: z.enum(['critical', 'high', 'medium', 'low']),
  action_required: z.enum(['yes', 'monitor', 'awareness']),
  regulatory_theme: z.enum([
    'conduct', 'prudential', 'consumer-duty', 'complaints',
    'governance', 'operational-resilience', 'aml-fraud',
    'data-privacy', 'market-competition', 'other',
  ]),
  suggested_next_step: z.string().min(5).max(2000),
  category_tags: z.array(z.string()).min(0).max(10),
  priority_score: z.number().int().min(1).max(10),
  priority_rationale: z.string().min(5).max(1000),
  deadline: z.string().nullable().transform((val) => {
    if (!val) return null
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : val
  }),
}).transform((data) => ({
  // Normalise the firm-type array — accept whichever key the model used
  summary: data.summary,
  why_it_matters: data.why_it_matters,
  affected_audience: data.affected_firm_types ?? data.affected_audience ?? [],
  affected_functions: data.affected_functions,
  urgency: data.urgency,
  action_required: data.action_required,
  regulatory_theme: data.regulatory_theme,
  suggested_next_step: data.suggested_next_step,
  category_tags: data.category_tags,
  priority_score: data.priority_score,
  priority_rationale: data.priority_rationale,
  deadline: data.deadline,
}))

// ── OpenAI client ─────────────────────────────────────────────────────────

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is not set')
  return new OpenAI({ apiKey })
}

// ── Core summarisation call ───────────────────────────────────────────────

async function summariseItem(
  client: OpenAI,
  item: IntelligenceItem
): Promise<AISummaryOutput> {
  const userPrompt = buildSummarisePrompt({
    title: item.title,
    source_name: item.source_name,
    content_type: item.content_type,
    publish_date: item.publish_date,
    raw_excerpt: item.raw_excerpt,
    source_url: item.source_url,
  })

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.15,
    max_tokens: 1600,            // increased from 1200 to fit the new fields
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('OpenAI returned empty response')

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error(`OpenAI returned invalid JSON: ${content.slice(0, 200)}`)
  }

  const validated = AISummarySchema.parse(parsed)
  return validated as AISummaryOutput
}

// ── DB write helper ───────────────────────────────────────────────────────

async function persistSummary(item: IntelligenceItem, summary: AISummaryOutput): Promise<void> {
  await updateIntelligenceItemSummary(item.id, {
    ai_summary: summary.summary,
    why_it_matters: summary.why_it_matters,
    affected_audience: summary.affected_audience,
    affected_functions: summary.affected_functions,
    urgency: summary.urgency,
    suggested_next_step: summary.suggested_next_step,
    category_tags: summary.category_tags,
    priority_score: summary.priority_score,
    confidence_status: 'ai-generated',
    is_processed: true,
    action_required: summary.action_required,
    regulatory_theme: summary.regulatory_theme,
    deadline: summary.deadline,
    priority_rationale: summary.priority_rationale,
  })
}

async function persistFailure(item: IntelligenceItem): Promise<void> {
  // Mark processed with 'pending' confidence so it won't block future normal runs
  // but is still retrievable by reprocess --missing
  await updateIntelligenceItemSummary(item.id, {
    ai_summary: null,
    why_it_matters: null,
    affected_audience: [],
    affected_functions: [],
    urgency: 'medium',
    suggested_next_step: 'Manual review required — AI summarisation failed.',
    category_tags: [],
    priority_score: 5,
    confidence_status: 'pending',
    is_processed: true,
  }).catch(() => {/* don't let update errors crash the loop */})
}

// ── Shared batch processor ────────────────────────────────────────────────

export interface SummarisationResult {
  processed: number
  failed: number
  errors: string[]
  duration_ms: number
}

async function runBatch(
  items: IntelligenceItem[],
  client: OpenAI,
  timeBudgetMs: number,
  label: string
): Promise<SummarisationResult> {
  const start = Date.now()
  const errors: string[] = []
  let processed = 0
  let failed = 0

  if (items.length === 0) {
    console.log(`[summarise] ${label}: no items to process`)
    return { processed: 0, failed: 0, errors: [], duration_ms: 0 }
  }

  console.log(`[summarise] ${label}: processing ${items.length} items`)

  for (const item of items) {
    if (Date.now() - start > timeBudgetMs) {
      errors.push(
        `[summarise] Time budget (${timeBudgetMs}ms) reached after ${processed + failed} items. ` +
        `${items.length - processed - failed} items remain — run again to continue.`
      )
      break
    }

    try {
      const summary = await summariseItem(client, item)
      await persistSummary(item, summary)
      processed++
      // Polite rate-limit spacing
      await new Promise((resolve) => setTimeout(resolve, 300))
    } catch (err) {
      failed++
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Failed "${item.title.slice(0, 60)}…" (${item.id}): ${msg}`)
      await persistFailure(item)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return { processed, failed, errors, duration_ms: Date.now() - start }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Process all unprocessed (is_processed=false) items.
 * Called by the daily cron and the /api/summarise endpoint after ingest.
 */
export async function processUnprocessedItems(
  options: {
    maxItems?: number
    timeBudgetMs?: number
  } = {}
): Promise<SummarisationResult> {
  const { maxItems = 200, timeBudgetMs = 8 * 60 * 1000 } = options
  const start = Date.now()

  if (!process.env.OPENAI_API_KEY) {
    return {
      processed: 0, failed: 0,
      errors: ['OPENAI_API_KEY not set — skipping AI summarisation'],
      duration_ms: Date.now() - start,
    }
  }

  const client = getOpenAIClient()
  const items = await getUnprocessedItems(maxItems)
  const result = await runBatch(items, client, timeBudgetMs, 'unprocessed batch')
  return { ...result, duration_ms: Date.now() - start }
}

/**
 * Reprocess existing items — for refreshing summaries after a prompt upgrade.
 *
 * Modes:
 *   'missing'  — items where ai_summary IS NULL or confidence_status = 'pending'
 *                (safe default: touches only items that were never successfully summarised)
 *   'all'      — every item, regardless of current summary state
 *                (use after a major prompt change; respects maxItems cap)
 *
 * Options:
 *   mode         'missing' | 'all'        default 'missing'
 *   maxItems     number                   default 200
 *   source       string                   filter to one source (e.g. 'FCA')
 *   timeBudgetMs number                   default 8 minutes
 *   dryRun       boolean                  log what would run without calling OpenAI
 */
export async function reprocessItems(
  options: {
    mode?: 'missing' | 'all'
    maxItems?: number
    source?: string
    timeBudgetMs?: number
    dryRun?: boolean
  } = {}
): Promise<SummarisationResult & { dry_run?: boolean }> {
  const {
    mode = 'missing',
    maxItems = 200,
    source,
    timeBudgetMs = 8 * 60 * 1000,
    dryRun = false,
  } = options

  const start = Date.now()

  if (!process.env.OPENAI_API_KEY && !dryRun) {
    return {
      processed: 0, failed: 0,
      errors: ['OPENAI_API_KEY not set — skipping reprocessing'],
      duration_ms: Date.now() - start,
    }
  }

  const items = await getItemsForReprocessing({ mode, maxItems, source })

  if (dryRun) {
    console.log(`[reprocess] DRY RUN — mode=${mode} source=${source ?? 'all'} limit=${maxItems}`)
    console.log(`[reprocess] Would process ${items.length} items:`)
    items.slice(0, 20).forEach((item, i) => {
      console.log(
        `  [${i + 1}] [${item.source_name}] ${item.title.slice(0, 70)} ` +
        `(status=${item.confidence_status}, processed=${item.is_processed})`
      )
    })
    if (items.length > 20) console.log(`  … and ${items.length - 20} more`)
    return { processed: 0, failed: 0, errors: [], duration_ms: Date.now() - start, dry_run: true }
  }

  const client = getOpenAIClient()
  const label = `reprocess [mode=${mode}${source ? ` source=${source}` : ''}]`
  const result = await runBatch(items, client, timeBudgetMs, label)
  return { ...result, duration_ms: Date.now() - start }
}

/**
 * Re-summarise a single item by ID.
 * Used from the admin panel or for spot-fixing a bad summary.
 */
export async function summariseSingleItem(itemId: string): Promise<AISummaryOutput> {
  const { getIntelligenceItemById } = await import('../db/intelligence')
  const item = await getIntelligenceItemById(itemId)
  if (!item) throw new Error(`Item not found: ${itemId}`)

  const client = getOpenAIClient()
  const summary = await summariseItem(client, item)
  await persistSummary(item, summary)
  return summary
}
