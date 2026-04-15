/**
 * AI generation service for premium deliverable outputs.
 * Called from /api/generate — never called directly from the browser.
 *
 * Uses GPT-4o for richer, more structured output than the summarisation pipeline.
 * DO NOT import from prompts.ts (that file is for ingestion summarisation only).
 */

import OpenAI from 'openai'
import { z } from 'zod'
import { getOutputPrompt } from './output-prompts'
import type {
  IntelligenceItem,
  OutputType,
  OutputContent,
  DeliveryBriefContent,
  CompliancePackContent,
  GovernanceBriefContent,
  BoardSummaryContent,
  ImplementationPlanContent,
} from '../types'

// ── OpenAI client ──────────────────────────────────────────────────────────

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable')
  return new OpenAI({ apiKey })
}

// ── Zod schemas for each output type ──────────────────────────────────────

const DeliveryBriefSchema = z.object({
  what_changed: z.string(),
  why_it_matters: z.string(),
  affected_areas: z.array(z.string()),
  key_risks: z.array(z.string()),
  recommended_owners: z.array(z.object({
    role: z.string(),
    responsibility: z.string(),
  })),
  immediate_actions: z.array(z.string()),
  suggested_timeline: z.string(),
  confidence_note: z.string(),
})

const CompliancePackSchema = z.object({
  regulatory_obligations: z.array(z.string()),
  policies_impacted: z.array(z.string()),
  controls_to_review: z.array(z.string()),
  evidence_required: z.array(z.string()),
  suggested_attestations: z.array(z.string()),
  monitoring_actions: z.array(z.string()),
  confidence_note: z.string(),
})

const GovernanceBriefSchema = z.object({
  decision_points: z.array(z.string()),
  risk_areas: z.array(z.string()),
  dependencies: z.array(z.string()),
  required_governance_forums: z.array(z.string()),
  escalation_considerations: z.array(z.string()),
  confidence_note: z.string(),
})

const BoardSummarySchema = z.object({
  executive_summary: z.string(),
  strategic_relevance: z.string(),
  regulatory_exposure: z.string(),
  key_decisions_required: z.array(z.string()),
  board_questions: z.array(z.string()),
  confidence_note: z.string(),
})

const ImplementationPlanSchema = z.object({
  workstreams: z.array(z.object({
    name: z.string(),
    description: z.string(),
    owner_role: z.string(),
  })),
  milestones: z.array(z.object({
    milestone: z.string(),
    timeframe: z.string(),
    phase: z.string(),
  })),
  raid: z.object({
    risks: z.array(z.string()),
    assumptions: z.array(z.string()),
    issues: z.array(z.string()),
    dependencies: z.array(z.string()),
  }),
  delivery_phases: z.object({
    days_0_30: z.array(z.string()),
    days_31_60: z.array(z.string()),
    days_61_90: z.array(z.string()),
  }),
  confidence_note: z.string(),
})

function validateOutput(type: OutputType, raw: unknown): OutputContent {
  switch (type) {
    case 'delivery_brief':
      return DeliveryBriefSchema.parse(raw) as DeliveryBriefContent
    case 'compliance_pack':
      return CompliancePackSchema.parse(raw) as CompliancePackContent
    case 'governance_brief':
      return GovernanceBriefSchema.parse(raw) as GovernanceBriefContent
    case 'board_summary':
      return BoardSummarySchema.parse(raw) as BoardSummaryContent
    case 'implementation_plan':
      return ImplementationPlanSchema.parse(raw) as ImplementationPlanContent
  }
}

// ── Main generation function ───────────────────────────────────────────────

export interface GenerateOutputOptions {
  item: IntelligenceItem
  outputType: OutputType
}

export interface GenerateOutputResult {
  content: OutputContent
  title: string
}

export async function generateOutput(
  options: GenerateOutputOptions
): Promise<GenerateOutputResult> {
  const { item, outputType } = options
  const openai = getOpenAIClient()
  const { system, user } = getOutputPrompt(outputType, item)

  let rawText: string | null = null

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',           // Use GPT-4o for higher quality deliverables
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2500,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    })

    rawText = completion.choices[0]?.message?.content ?? null
    if (!rawText) throw new Error('OpenAI returned empty response')

    const parsed = JSON.parse(rawText)
    const content = validateOutput(outputType, parsed)

    // Build a descriptive title for the output
    const typeLabel: Record<OutputType, string> = {
      delivery_brief: 'Delivery Brief',
      compliance_pack: 'Compliance Action Pack',
      governance_brief: 'Governance Brief',
      board_summary: 'Board Summary',
      implementation_plan: 'Implementation Plan',
    }
    const title = `${typeLabel[outputType]}: ${item.title.slice(0, 80)}${item.title.length > 80 ? '…' : ''}`

    return { content, title }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Include raw text in error for debugging
    throw new Error(
      `Output generation failed for type '${outputType}': ${message}` +
      (rawText ? `\nRaw response: ${rawText.slice(0, 300)}` : '')
    )
  }
}
