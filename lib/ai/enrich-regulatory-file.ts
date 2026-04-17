/**
 * Regulatory File Enrichment Service — Phase 1 (source analysis only)
 *
 * What this service does:
 *   GPT-4o analyses the intelligence item and produces structured analysis
 *   grounded in what the source material actually says. Output covers:
 *       - source-grounded summary
 *       - operative points (with attribution labels)
 *       - action triggers (explicit / inferred / AI-suggested)
 *       - ambiguity areas (what needs legal/compliance judgement)
 *       - synthesis (consensus vs uncertainty)
 *       - ownership/governance implications
 *       - likely evidence artefacts
 *       - BankScope operational view (AI-assisted, clearly labelled)
 *       - commentary search queries (for Phase 2 live retrieval only)
 *
 * What this service DOES NOT do:
 *   - Generate synthetic commentary attributed to Deloitte, KPMG, law firms,
 *     or any other external organisation
 *   - Populate external_commentary with AI-fabricated summaries
 *   - Invent citations, URLs, or publication titles
 *
 * External commentary (Phase 2):
 *   Not implemented. commentary_status is always set to 'search_ready'.
 *   external_commentary is always returned as an empty array.
 *   Real commentary must be fetched from live, verified URLs by a
 *   separate enrichment step before it may appear in the dossier.
 *
 * Attribution model — enforced in every output:
 *   'explicit'           = verbatim or near-verbatim from source
 *   'likely_implication' = strong logical inference; stated as inference
 *   'ai_interpretation'  = AI-suggested; flagged for internal validation
 */

import OpenAI from 'openai'
import type { IntelligenceItem } from '../types'
import type {
  RegulatoryFile,
  OperativePoint,
  ActionTrigger,
  AmbiguityArea,
  RegFileSynthesis,
  OwnershipImplications,
  LikelyArtefact,
  BankScopeView,
  SourceGroundedSummary,
} from '../types/regulatory-file'

// ── OpenAI client ──────────────────────────────────────────────────────────

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable')
  return new OpenAI({ apiKey })
}

const ENRICHMENT_MODEL = 'gpt-4o'

// ── Context builder ────────────────────────────────────────────────────────

function buildEnrichmentContext(item: IntelligenceItem): string {
  return [
    `TITLE: ${item.title}`,
    `SOURCE ORGANISATION: ${item.source_name}`,
    `CONTENT TYPE: ${item.content_type}`,
    `PUBLICATION DATE: ${item.publish_date ?? 'not stated'}`,
    `URGENCY: ${item.urgency ?? 'not assessed'}`,
    `PRIORITY SCORE: ${item.priority_score ?? 'not scored'}/10`,
    `REGULATORY THEME: ${item.regulatory_theme ?? 'not categorised'}`,
    `ACTION REQUIRED: ${item.action_required ?? 'not stated'}`,
    item.deadline ? `STATED COMPLIANCE DEADLINE: ${item.deadline}` : '',
    item.ai_summary ? `AI SUMMARY OF SOURCE: ${item.ai_summary}` : '',
    item.why_it_matters ? `WHY IT MATTERS (initial assessment): ${item.why_it_matters}` : '',
    item.suggested_next_step ? `SUGGESTED NEXT STEP (initial): ${item.suggested_next_step}` : '',
    item.priority_rationale ? `PRIORITY RATIONALE: ${item.priority_rationale}` : '',
    item.affected_audience.length > 0 ? `AFFECTED FIRM TYPES: ${item.affected_audience.join(', ')}` : '',
    item.affected_functions.length > 0 ? `AFFECTED FUNCTIONS: ${item.affected_functions.join(', ')}` : '',
    item.category_tags.length > 0 ? `TOPIC TAGS: ${item.category_tags.join(', ')}` : '',
    item.raw_excerpt ? `RAW SOURCE EXCERPT:\n${item.raw_excerpt}` : '',
    item.source_url ? `SOURCE URL: ${item.source_url}` : '',
  ].filter(Boolean).join('\n')
}

// ── System prompt ──────────────────────────────────────────────────────────

const ENRICHMENT_SYSTEM = `You are a specialist UK financial services regulatory intelligence analyst.
Your role is to produce a structured, rigorous regulatory file grounded entirely in the provided source material.

CRITICAL ATTRIBUTION RULES — follow these exactly, without exception:
1. "explicit" = something directly stated or unambiguously written in the source document. If you cannot point to specific wording in the source, do not use this label.
2. "likely_implication" = a strong logical inference a reasonable professional would draw from what the source says. State it as an inference.
3. "ai_interpretation" = AI-suggested interpretation going beyond direct inference. Must be flagged as needing internal validation.
4. NEVER mark a point as "explicit" unless it is genuinely traceable to the source text provided.
5. NEVER invent regulatory references, rule numbers, dates, thresholds, or firm examples not present in the source.
6. NEVER generate external commentary attributed to Deloitte, KPMG, PwC, EY, law firms, industry bodies, or any other organisation. That section does not exist in this schema.
7. If the source material is thin (short summary only, no excerpt), reduce the number of operative points and action triggers, use "likely_implication" or "ai_interpretation" labels, and surface that uncertainty in ambiguity_areas.
8. Prefer honest "insufficient source material to determine" over plausible-sounding filler.
9. If you are uncertain, say so explicitly. Uncertainty is more useful than false confidence.

You must return ONLY valid JSON matching the schema below. No markdown, no explanation, no text outside the JSON object.`

// ── Main enrichment prompt ─────────────────────────────────────────────────

/** Returns true if the item has enough source content to support detailed analysis */
function hasSufficientSourceMaterial(item: IntelligenceItem): boolean {
  const hasExcerpt = typeof item.raw_excerpt === 'string' && item.raw_excerpt.trim().length > 100
  const hasSummary = typeof item.ai_summary === 'string' && item.ai_summary.trim().length > 80
  return hasExcerpt || hasSummary
}

function buildEnrichmentPrompt(item: IntelligenceItem): string {
  const sparse = !hasSufficientSourceMaterial(item)

  const sparsePreamble = sparse
    ? `IMPORTANT — SOURCE MATERIAL IS THIN:
The source material for this item contains only a brief summary with no raw excerpt.
- Reduce operative points to 2-3 maximum
- Label most points as "likely_implication" or "ai_interpretation" (not "explicit") unless the summary directly states the point
- Be explicit in ambiguity_areas that source detail is limited
- Do not invent specifics (rule numbers, dates, thresholds) not present in the summary
- In source_summary.explicitly_stated, only include things the summary directly states — if fewer than 2 clear statements exist, return only those
- Prefer honest uncertainty over confident-sounding filler

`
    : ''

  return `${sparsePreamble}Generate a structured regulatory file for the following intelligence item.

INTELLIGENCE ITEM:
${buildEnrichmentContext(item)}

Return a JSON object with EXACTLY this structure. Every field is required.
Do NOT include an "external_commentary" key — that section does not exist in this schema.

{
  "source_summary": {
    "what_changed": "2-3 sentences describing what the regulator published or changed. Name the specific rule, guidance, or instrument if it appears in the source. Be precise about what is new vs amended. If source is thin, say so.",
    "publication_purpose": "1-2 sentences: what this document aims to achieve from the regulator's perspective.",
    "firms_most_affected": ["firm types most directly affected — e.g. 'retail banks', 'building societies'"],
    "functions_most_affected": ["internal functions — e.g. 'compliance', 'risk', 'mortgage origination'"],
    "explicitly_stated": [
      "Only include statements directly traceable to the source text — e.g. 'The FCA states that firms must complete a consumer outcome assessment by [date]'",
      "If source is thin, return only what you can actually attribute. Do not pad this list."
    ]
  },

  "operative_points": [
    {
      "point": "Specific operative point — concrete and practical. If inferred rather than stated, say so in source_basis.",
      "source_basis": "Exact or paraphrased wording from the source that supports this point. If no direct source basis, explain the inference.",
      "attribution": "explicit | likely_implication | ai_interpretation",
      "relevance_to_firms": "Why this matters for a typical UK retail financial services firm."
    }
  ],

  "action_triggers": [
    {
      "trigger": "Specific action this item triggers — e.g. 'Review Consumer Duty product governance documentation for all retail products'",
      "category": "policy_review | control_review | process_change | governance_escalation | board_visibility | implementation_planning | monitoring_evidence | legal_interpretation | training | reporting | other",
      "attribution": "explicit | likely_implication | ai_interpretation",
      "priority": "high | medium | low",
      "notes": "Why this trigger is important and what risk arises if not actioned."
    }
  ],

  "ambiguity_areas": [
    {
      "area": "Specific area of ambiguity or interpretive difficulty",
      "clarity": "clear | ambiguous | interpretive | needs_legal",
      "why_unclear": "Why this is unclear or requires professional judgement",
      "suggested_resolution": "How a firm might resolve this — e.g. seek legal opinion, wait for regulator FAQ, apply proportionality"
    }
  ],

  "synthesis": {
    "consensus_points": ["Points that are clear and well-supported — a firm can rely on these"],
    "uncertain_points": ["Points that remain open to interpretation or need further clarity"],
    "actionable_now": ["Things a firm can act on immediately without needing more clarity"],
    "needs_sign_off": ["Things requiring legal or compliance sign-off before acting"]
  },

  "ownership": {
    "accountable_functions": ["e.g. 'Compliance', 'Risk', 'Operations'"],
    "likely_business_owners": ["e.g. 'Chief Compliance Officer', 'Head of Retail Banking'"],
    "governance_forums": ["e.g. 'Risk Committee', 'Board Audit & Risk Committee'"],
    "board_visibility_required": true,
    "board_visibility_rationale": "Why board visibility is or is not required",
    "smcr_relevant": true,
    "smcr_note": "Which Senior Managers carry accountability, or null if not SMCR-relevant"
  },

  "likely_artefacts": [
    {
      "artefact": "Specific document a firm may need to produce — e.g. 'Board-approved gap analysis against new requirements'",
      "type": "briefing_note | board_paper | policy_update | control_mapping | implementation_tracker | committee_paper | training_material | attestation | gap_analysis | legal_opinion | regulatory_notification | other",
      "priority": "high | medium | low",
      "attribution": "explicit | likely_implication | ai_interpretation"
    }
  ],

  "commentary_search_queries": [
    "Specific search query to find real published commentary on this topic — e.g. 'Deloitte FCA [regulation name] regulatory insights 2024'",
    "Continue for 4-6 targeted queries covering different high-trust source types (Big 4, law firms, regulator follow-up, industry bodies)"
  ],

  "bankscope_view": {
    "action_now": ["Things a firm can likely start now — specific and practical"],
    "escalate": ["Things that should immediately go to senior governance — e.g. 'Notify CRO and Risk Committee'"],
    "validate_first": ["Things that need compliance or legal sign-off before proceeding"],
    "monitor": ["Things to watch for further developments before acting"],
    "disclaimer": "This operational guidance is AI-assisted and based on the regulatory source cited. It does not constitute legal or compliance advice. All recommended actions must be validated by your compliance function and legal advisers before execution."
  }
}

Target output sizes (adjust DOWN if source material is thin):
- operative_points: ${sparse ? '2-3' : '4-8'} (prefer quality over quantity)
- action_triggers: ${sparse ? '3-5' : '5-9'} (prioritised high→low)
- ambiguity_areas: ${sparse ? '2-4' : '3-5'} (be genuinely honest about uncertainty)
- commentary_search_queries: 4-6
- likely_artefacts: ${sparse ? '3-5' : '4-7'}
- bankscope_view arrays: 2-4 items each`
}

// ── Enrichment executor ────────────────────────────────────────────────────

export interface EnrichmentResult {
  source_summary: SourceGroundedSummary
  operative_points: OperativePoint[]
  action_triggers: ActionTrigger[]
  ambiguity_areas: AmbiguityArea[]
  /**
   * Always empty after Phase 1 enrichment.
   * Populated only by a future Phase 2 live-fetch step that retrieves and
   * verifies real URLs. Never populated with AI-generated summaries.
   */
  external_commentary: []
  commentary_search_queries: string[]
  /** Always 'search_ready' after Phase 1 — no content fetched yet */
  commentary_status: 'search_ready'
  synthesis: RegFileSynthesis
  ownership: OwnershipImplications
  likely_artefacts: LikelyArtefact[]
  bankscope_view: BankScopeView
  enrichment_model: string
}

export async function enrichRegulatoryFile(
  item: IntelligenceItem
): Promise<EnrichmentResult> {
  const openai = getOpenAIClient()
  let rawText: string | null = null

  try {
    const completion = await openai.chat.completions.create({
      model: ENRICHMENT_MODEL,
      response_format: { type: 'json_object' },
      temperature: 0.1,    // Very low for consistent, schema-adherent output
      max_tokens: 4000,    // Generous — this is a rich schema
      messages: [
        { role: 'system', content: ENRICHMENT_SYSTEM },
        { role: 'user', content: buildEnrichmentPrompt(item) },
      ],
    })

    rawText = completion.choices[0]?.message?.content ?? null
    if (!rawText) throw new Error('OpenAI returned empty response')

    const parsed = JSON.parse(rawText)

    // Validate required top-level keys (external_commentary is NOT expected)
    const requiredKeys = [
      'source_summary', 'operative_points', 'action_triggers',
      'ambiguity_areas', 'synthesis', 'ownership', 'likely_artefacts',
      'bankscope_view', 'commentary_search_queries',
    ]
    for (const key of requiredKeys) {
      if (!(key in parsed)) throw new Error(`Missing required key in enrichment response: ${key}`)
    }

    // Hard guard: if the model returns external_commentary despite the prompt
    // explicitly excluding it, discard it unconditionally.
    if ('external_commentary' in parsed) {
      console.warn(
        '[enrich-regulatory-file] Model returned external_commentary despite prompt exclusion — discarding'
      )
    }

    return {
      source_summary: parsed.source_summary,
      operative_points: parsed.operative_points,
      action_triggers: parsed.action_triggers,
      ambiguity_areas: parsed.ambiguity_areas,
      external_commentary: [],          // Always empty — Phase 2 live fetch not implemented
      commentary_search_queries: parsed.commentary_search_queries ?? [],
      commentary_status: 'search_ready', // Always — no commentary has been fetched
      synthesis: parsed.synthesis,
      ownership: parsed.ownership,
      likely_artefacts: parsed.likely_artefacts,
      bankscope_view: parsed.bankscope_view,
      enrichment_model: ENRICHMENT_MODEL,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Regulatory file enrichment failed: ${msg}` +
      (rawText ? `\nRaw: ${rawText.slice(0, 400)}` : '')
    )
  }
}
