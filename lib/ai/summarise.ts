import OpenAI from 'openai'
import { z } from 'zod'
import { SYSTEM_PROMPT, buildSummarisePrompt } from './prompts'
import { getUnprocessedItems, updateIntelligenceItemSummary } from '../db/intelligence'
import type { AISummaryOutput, IntelligenceItem } from '../types'

// Zod schema — validates all fields returned by the improved prompt
const AISummarySchema = z.object({
  summary: z.string().min(10).max(3000),
  affected_audience: z.array(z.string()).min(0).max(20),
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
    // Validate YYYY-MM-DD format; reject invalid strings
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : val
  }),
})

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is not set')
  return new OpenAI({ apiKey })
}

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
    max_tokens: 1200,
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

export interface SummarisationResult {
  processed: number
  failed: number
  errors: string[]
  duration_ms: number
}

/**
 * Process all unprocessed items in batches.
 * - No arbitrary batch cap — fetches all pending items and processes them all.
 * - Respects a per-run time budget (default 8 minutes) to stay within Vercel function limits.
 * - Rate-limit backoff: 300ms between successful calls; 1s after errors.
 */
export async function processUnprocessedItems(
  options: {
    /** Max items to process in this run. Defaults to 200 (effectively uncapped for normal volumes). */
    maxItems?: number
    /** Per-run time budget in ms. Defaults to 8 minutes. */
    timeBudgetMs?: number
  } = {}
): Promise<SummarisationResult> {
  const { maxItems = 200, timeBudgetMs = 8 * 60 * 1000 } = options
  const start = Date.now()
  const errors: string[] = []
  let processed = 0
  let failed = 0

  if (!process.env.OPENAI_API_KEY) {
    return {
      processed: 0,
      failed: 0,
      errors: ['OPENAI_API_KEY not set — skipping AI summarisation'],
      duration_ms: Date.now() - start,
    }
  }

  const client = getOpenAIClient()
  // Fetch all pending items in one go (up to maxItems)
  const items = await getUnprocessedItems(maxItems)

  if (items.length === 0) {
    return { processed: 0, failed: 0, errors: [], duration_ms: Date.now() - start }
  }

  console.log(`[summarise] Processing ${items.length} unprocessed items`)

  // Process sequentially to respect OpenAI rate limits
  for (const item of items) {
    // Time budget check — stop if we're approaching the limit
    if (Date.now() - start > timeBudgetMs) {
      errors.push(`Time budget (${timeBudgetMs}ms) reached after ${processed + failed} items. ${items.length - processed - failed} items remain for next run.`)
      break
    }

    try {
      const summary = await summariseItem(client, item)

      await updateIntelligenceItemSummary(item.id, {
        ai_summary: summary.summary,
        affected_audience: summary.affected_audience,
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

      processed++

      // Polite rate-limit spacing
      await new Promise((resolve) => setTimeout(resolve, 300))
    } catch (err) {
      failed++
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Failed to summarise "${item.title.slice(0, 60)}…" (${item.id}): ${msg}`)

      // Mark as processed with 'pending' confidence so it won't block future runs
      // but can be re-queued manually
      await updateIntelligenceItemSummary(item.id, {
        ai_summary: null,
        affected_audience: [],
        urgency: 'medium',
        suggested_next_step: 'Manual review required — AI summarisation failed.',
        category_tags: [],
        priority_score: 5,
        confidence_status: 'pending',
        is_processed: true,
      }).catch(() => {/* don't let update errors crash the loop */})

      // Longer pause after an error (possible rate limit hit)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return {
    processed,
    failed,
    errors,
    duration_ms: Date.now() - start,
  }
}

/**
 * Re-summarise a single item by ID (useful from the admin panel).
 * Forces is_processed = true and updates all AI fields.
 */
export async function summariseSingleItem(itemId: string): Promise<AISummaryOutput> {
  const { getIntelligenceItemById } = await import('../db/intelligence')
  const item = await getIntelligenceItemById(itemId)
  if (!item) throw new Error(`Item not found: ${itemId}`)

  const client = getOpenAIClient()
  const summary = await summariseItem(client, item)

  await updateIntelligenceItemSummary(item.id, {
    ai_summary: summary.summary,
    affected_audience: summary.affected_audience,
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

  return summary
}
