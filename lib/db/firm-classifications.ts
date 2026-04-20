/**
 * Database operations for firm_classifications and scope summary generation.
 * All DB mutations use the admin client (service role) — auth is enforced at
 * the API route layer before these functions are called.
 */

import OpenAI from 'openai'
import { createAdminClient } from './client'
import { generateScopeSummaryPrompt, parseScopeSummary } from '../ai/scopes-prompts'
import type { FirmClassification, FirmClassificationStub, ScopeSummary } from '../types'

// ── Static stub list (used by Filters.tsx to avoid a DB round-trip) ────────

/**
 * Mirrors the seed data in seed-firm-classifications.ts.
 * Kept in sync manually — only slug, name, description, and regulators are needed.
 * This lets the Filters component render without an async fetch.
 */
export const FIRM_CLASSIFICATION_STUBS: FirmClassificationStub[] = [
  {
    id: '',
    slug: 'small_accountancy_firm',
    name: 'Small Accountancy Firm',
    description: 'Small practices offering audit, tax, VAT, and payroll services.',
    regulators: ['HM Treasury', 'ICO', 'Companies House'],
  },
  {
    id: '',
    slug: 'car_dealership_finance',
    name: 'Car Dealership Offering Finance',
    description: 'Motor dealers offering HP/PCP finance and credit brokerage.',
    regulators: ['FCA', 'FOS', 'FSCS', 'ASA', 'ICO', 'Companies House'],
  },
  {
    id: '',
    slug: 'ifa',
    name: 'Independent Financial Adviser (IFA)',
    description: 'Whole-of-market investment, pension, protection, and mortgage advice.',
    regulators: ['FCA', 'FOS', 'FSCS', 'TPR', 'ICO'],
  },
  {
    id: '',
    slug: 'high_street_lender',
    name: 'High-Street Lender / Credit Union',
    description: 'Community lenders and credit unions providing loans and savings products.',
    regulators: ['FCA', 'PRA', 'FOS', 'FSCS', 'ICO', 'Companies House'],
  },
  {
    id: '',
    slug: 'mortgage_broker',
    name: 'Residential Mortgage Broker',
    description: 'FCA-authorised firms providing whole-of-market mortgage advice.',
    regulators: ['FCA', 'FOS', 'FSCS', 'ICO', 'Companies House'],
  },
]

// ── Read operations ─────────────────────────────────────────────────────────

export async function getFirmClassifications(): Promise<FirmClassification[]> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('firm_classifications')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw new Error(`Failed to fetch firm classifications: ${error.message}`)
  return (data ?? []) as FirmClassification[]
}

export async function getFirmClassificationBySlug(
  slug: string
): Promise<FirmClassification | null> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('firm_classifications')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return null
  return data as FirmClassification
}

export async function getFirmClassificationById(
  id: string
): Promise<FirmClassification | null> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('firm_classifications')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as FirmClassification
}

// ── Scope summary generation ────────────────────────────────────────────────

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable')
  return new OpenAI({ apiKey })
}

/**
 * Generate and persist a scope summary for the given classification.
 *
 * Checks scope_enriched_at first — only regenerates if:
 *   1. scope_enriched_at IS NULL (never generated), OR
 *   2. force === true (user explicitly requested refresh)
 *
 * Returns the stored summary on cache hit (no AI call, no credit charge at caller level).
 */
export async function generateAndSaveScopeSummary(
  classification: FirmClassification,
  force = false
): Promise<{ summary: ScopeSummary; fromCache: boolean }> {
  // Cache hit — return existing summary
  if (!force && classification.scope_enriched_at && classification.scope_summary) {
    return { summary: classification.scope_summary, fromCache: true }
  }

  // Generate via OpenAI
  const openai = getOpenAIClient()
  const { system, user } = generateScopeSummaryPrompt(classification)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  const rawText = completion.choices[0]?.message?.content ?? '{}'
  let rawJson: unknown
  try {
    rawJson = JSON.parse(rawText)
  } catch {
    throw new Error('OpenAI returned non-JSON content for scope summary')
  }

  const summary = parseScopeSummary(rawJson)
  if (!summary) {
    throw new Error('OpenAI response did not match the ScopeSummary schema')
  }

  // Persist to DB
  const db = createAdminClient()
  const { error: updateError } = await db
    .from('firm_classifications')
    .update({
      scope_summary: summary,
      scope_enriched_at: new Date().toISOString(),
    })
    .eq('id', classification.id)

  if (updateError) {
    throw new Error(`Failed to save scope summary: ${updateError.message}`)
  }

  return { summary, fromCache: false }
}

// ── Credit deduction helper ─────────────────────────────────────────────────

/**
 * Deduct 1 credit for scope generation using the atomic deduct_credits RPC.
 * The RPC uses SELECT ... FOR UPDATE which is safe under concurrent requests.
 * Returns false if the deduction failed (insufficient balance or DB error).
 *
 * Consistent with the deductCredits() function in lib/db/outputs.ts.
 */
export async function deductScopeCredit(
  userId: string,
  _classificationId: string   // kept for call-site clarity; not passed to RPC
): Promise<boolean> {
  const db = createAdminClient()
  const { data, error } = await db.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: 1,
    p_reason: 'output_generated',
    p_output_id: null,
  })

  if (error) {
    console.error('[deductScopeCredit] RPC error:', error.message)
    return false
  }

  return data === true
}
