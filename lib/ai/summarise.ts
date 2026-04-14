import OpenAI from 'openai'
import { z } from 'zod'
import { SYSTEM_PROMPT, buildSummarisePrompt } from './prompts'
import { getUnprocessedItems, updateIntelligenceItemSummary } from '../db/intelligence'
import type { AISummaryOutput, IntelligenceItem } from '../types'

const AISummarySchema = z.object({
  summary: z.string().min(10).max(2000),
  affected_audience: z.array(z.string()).min(0).max(20),
  urgency: z.enum(['critical', 'high', 'medium', 'low']),
  suggested_next_step: z.string().min(5).max(1000),
  category_tags: z.array(z.string()).min(0).max(10),
  priority_score: z.number().int().min(1).max(10),
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
    temperature: 0.2,
    max_tokens: 800,
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

export async function processUnprocessedItems(
  batchSize = 20
): Promise<SummarisationResult> {
  const start = Date.now()
  const errors: string[] = []
  let processed = 0
  let failed = 0

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return {
      processed: 0,
      failed: 0,
      errors: ['OPENAI_API_KEY not set — skipping AI summarisation'],
      duration_ms: Date.now() - start,
    }
  }

  const client = getOpenAIClient()
  const items = await getUnprocessedItems(batchSize)

  if (items.length === 0) {
    return { processed: 0, failed: 0, errors: [], duration_ms: Date.now() - start }
  }

  // Process sequentially to avoid rate limits
  for (const item of items) {
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
      })

      processed++

      // Small delay between API calls to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 200))
    } catch (err) {
      failed++
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Failed to summarise item ${item.id} ("${item.title.slice(0, 50)}"): ${msg}`)

      // Mark as processed with pending status so we don't retry immediately
      await updateIntelligenceItemSummary(item.id, {
        ai_summary: null,
        affected_audience: [],
        urgency: 'medium',
        suggested_next_step: 'Manual review required — AI summarisation failed.',
        category_tags: [],
        priority_score: 5,
        confidence_status: 'pending',
        is_processed: true,
      }).catch(() => {}) // ignore update errors
    }
  }

  return {
    processed,
    failed,
    errors,
    duration_ms: Date.now() - start,
  }
}

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
  })

  return summary
}
