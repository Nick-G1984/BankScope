/**
 * Prompt templates for firm classification scope summary generation.
 *
 * Returns a { system, user } pair for OpenAI chat completion.
 * The model should return structured JSON matching ScopeSummary.
 *
 * Follows the same architectural pattern as output-prompts.ts:
 *   - SHARED_SYSTEM defines persona and ground rules
 *   - generateScopeSummaryPrompt() builds the per-classification user message
 *   - JSON schema is embedded in the prompt to constrain output
 */

import type { FirmClassification, ScopeSummary } from '../types'

// ── Schema contract (kept in sync with ScopeSummary type) ─────────────────

const SCOPE_SUMMARY_SCHEMA = `{
  "high_level_overview": "<2–3 sentence plain-English explanation of the firm's main regulatory obligations and the spirit behind them>",
  "key_regulations": [
    "<Named legislative instrument or regulatory framework, e.g. 'Consumer Duty (FCA PS22/9)' — one per item, no duplication>"
  ],
  "key_regulators": [
    "<Name of the regulatory body with its role, e.g. 'FCA — conduct regulation, authorisation, and Consumer Duty supervision'>"
  ],
  "compliance_tasks": [
    "<A specific, actionable compliance task the firm should have in place, e.g. 'Annual review of Consumer Duty fair value assessments'>"
  ],
  "suggested_deliverables": [
    "<A concrete document or artefact, e.g. 'Consumer Duty Board champion terms of reference'>"
  ]
}`

const SHARED_SYSTEM = `You are a senior regulatory compliance specialist covering the full breadth of UK financial services, consumer credit, data protection, and sector-specific regulation.

You produce authoritative, precise scope summaries for regulated UK businesses. Your audience is a business owner or compliance officer who may not have legal training.

CRITICAL RULES:
1. Be specific. Name the exact regulatory instrument, FCA sourcebook, or legislative act where relevant.
2. Tailor every point to the specific firm type — do not give generic advice that would apply to any firm.
3. Distinguish clearly between:
   - Primary obligations (the firm is directly regulated)
   - Secondary/indirect obligations (the firm has duties because of customers or partners)
4. Use UK English. Reference UK-specific bodies, frameworks, and typical firm structures.
5. compliance_tasks should be practical, recurring operational tasks — not one-time setup items.
6. suggested_deliverables should be named documents a compliance team would actually produce.
7. Return ONLY valid JSON matching the schema exactly. No markdown fences, no explanation outside the JSON.
8. Aim for 5–8 items in each array. Quality over quantity — every item must be specific and useful.`

// ── Main prompt builder ────────────────────────────────────────────────────

/**
 * Builds the { system, user } prompt pair for scope summary generation.
 *
 * @param classification  Full FirmClassification record from the DB
 */
export function generateScopeSummaryPrompt(
  classification: FirmClassification
): { system: string; user: string } {
  const lines: string[] = [
    `Firm type: ${classification.name}`,
    `Description: ${classification.description}`,
    '',
    `Core services provided:`,
    ...classification.services.map((s) => `  - ${s}`),
    '',
    `Regulatory bodies identified:`,
    ...classification.regulators.map((r) => `  - ${r}`),
    '',
    `Known legislative/regulatory obligations:`,
    ...classification.obligations.map((o) => `  - ${o}`),
  ]

  return {
    system: SHARED_SYSTEM,
    user: `Generate a regulatory scope summary for the following UK firm type.

${lines.join('\n')}

Return a JSON object that exactly matches this schema:
${SCOPE_SUMMARY_SCHEMA}

Important:
- "high_level_overview" must explain the regulatory landscape in plain English, suitable for a business owner.
- "key_regulations" must list the specific named regulations, not just themes (e.g. not "data protection" but "UK GDPR (Data Protection Act 2018)").
- "key_regulators" must describe each body's specific role for this firm type, not just its name.
- "compliance_tasks" must be actionable, recurring tasks — not vague obligations.
- "suggested_deliverables" must be named documents this firm should maintain.`,
  }
}

// ── Schema validation ──────────────────────────────────────────────────────

/**
 * Validate and coerce the raw AI JSON response into a ScopeSummary.
 * Returns null if the object is clearly malformed.
 */
export function parseScopeSummary(raw: unknown): ScopeSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  const overview = typeof obj.high_level_overview === 'string' ? obj.high_level_overview : null
  if (!overview) return null

  function toStringArray(val: unknown): string[] {
    if (!Array.isArray(val)) return []
    return val.filter((v): v is string => typeof v === 'string')
  }

  return {
    high_level_overview: overview,
    key_regulations: toStringArray(obj.key_regulations),
    key_regulators: toStringArray(obj.key_regulators),
    compliance_tasks: toStringArray(obj.compliance_tasks),
    suggested_deliverables: toStringArray(obj.suggested_deliverables),
  }
}
