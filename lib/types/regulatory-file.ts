/**
 * Regulatory File — structured source-of-truth layer for each important
 * regulatory publication.
 *
 * Sits between raw ingestion and premium output generation.
 * Provides source-grounded analysis, interpretation, external commentary,
 * governance implications, and operational guidance.
 *
 * Attribution model (critical — never blur):
 *   'explicit'         — stated verbatim or near-verbatim in the source document
 *   'likely_implication' — logically follows from the source; strong inference
 *   'ai_interpretation'  — AI-suggested interpretation; should be validated internally
 *
 * Commentary attribution model:
 *   'fetched'          — URL was retrieved and content verified
 *   'ai_knowledge'     — from model training data; not a live fetch
 *   'ai_inferred'      — AI-suggested likelihood (no source URL available)
 */

// ── Attribution types ──────────────────────────────────────────────────────

export type AttributionType =
  | 'explicit'           // directly stated in source
  | 'likely_implication' // strong logical inference from source
  | 'ai_interpretation'  // AI-suggested; needs internal validation

export type CommentaryAttribution =
  | 'fetched'        // URL fetched and content verified
  | 'ai_knowledge'   // from model training knowledge; not live
  | 'ai_inferred'    // model inference; no specific source URL

export type ClarityLevel =
  | 'clear'           // stated without ambiguity in source
  | 'ambiguous'       // source wording is unclear or could be read multiple ways
  | 'interpretive'    // requires professional judgement to apply
  | 'needs_legal'     // likely needs formal legal or regulatory counsel

export type EnrichmentStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

// ── Sub-types ──────────────────────────────────────────────────────────────

/** A single operative point extracted from the source */
export interface OperativePoint {
  point: string                  // the substantive point
  source_basis: string           // what in the source supports this
  attribution: AttributionType
  relevance_to_firms: string     // why it matters for a typical UK FS firm
}

/** A specific potential action trigger identified in the publication */
export interface ActionTrigger {
  trigger: string
  category:
    | 'policy_review'
    | 'control_review'
    | 'process_change'
    | 'governance_escalation'
    | 'board_visibility'
    | 'implementation_planning'
    | 'monitoring_evidence'
    | 'legal_interpretation'
    | 'training'
    | 'reporting'
    | 'other'
  attribution: AttributionType
  priority: 'high' | 'medium' | 'low'
  notes: string
}

/** Area where clarity or professional judgement is needed */
export interface AmbiguityArea {
  area: string
  clarity: ClarityLevel
  why_unclear: string
  suggested_resolution: string  // how a firm could resolve this
}

/** External commentary from a reputable source */
export interface ExternalCommentary {
  source_name: string           // e.g. "Deloitte", "KPMG", "Allen & Overy"
  source_url: string | null     // URL if available / fetched
  publication_title: string
  publication_date: string | null
  summary: string               // what they say about this topic
  reinforces_source: boolean    // does it align with / clarify the regulator?
  introduces_caution: boolean   // does it add nuance, risk, or implementation complexity?
  key_points: string[]
  source_category:
    | 'big4'              // Deloitte, KPMG, PwC, EY
    | 'law_firm'          // Allen & Overy, Clifford Chance, Linklaters, etc.
    | 'regulator_followup'// Regulator FAQ, Dear CEO, speech, follow-up guidance
    | 'industry_body'     // TheCityUK, UK Finance, BSA, ABI, etc.
    | 'news_analysis'     // FT, Reuters, City A.M. (labelled clearly)
    | 'other'
  attribution: CommentaryAttribution
  verified: boolean             // was the URL actually fetched and content checked?
  confidence: 'high' | 'medium' | 'low'
}

/** Consensus and uncertainty synthesis */
export interface RegFileSynthesis {
  consensus_points: string[]    // widely supported across source + commentary
  uncertain_points: string[]    // open to interpretation or contested
  actionable_now: string[]      // a firm can likely act on this without waiting
  needs_sign_off: string[]      // requires internal legal / compliance sign-off first
}

/** Ownership and governance implications */
export interface OwnershipImplications {
  accountable_functions: string[]
  likely_business_owners: string[]
  governance_forums: string[]
  board_visibility_required: boolean
  board_visibility_rationale: string | null
  smcr_relevant: boolean
  smcr_note: string | null
}

/** Expected evidence / artefacts a firm may need to produce */
export interface LikelyArtefact {
  artefact: string
  type:
    | 'briefing_note'
    | 'board_paper'
    | 'policy_update'
    | 'control_mapping'
    | 'implementation_tracker'
    | 'committee_paper'
    | 'training_material'
    | 'attestation'
    | 'gap_analysis'
    | 'legal_opinion'
    | 'regulatory_notification'
    | 'other'
  priority: 'high' | 'medium' | 'low'
  attribution: AttributionType
}

/** BankScope operational guidance — clearly labelled as AI-assisted */
export interface BankScopeView {
  action_now: string[]           // can likely be actioned immediately
  escalate: string[]             // should be escalated to senior forums
  validate_first: string[]       // should be validated internally before acting
  monitor: string[]              // watch for further developments before acting
  disclaimer: string             // always present, clearly states AI-assisted nature
}

/** Source-grounded summary section */
export interface SourceGroundedSummary {
  what_changed: string           // the core change, cited from source
  publication_purpose: string    // what this document is trying to achieve
  firms_most_affected: string[]
  functions_most_affected: string[]
  explicitly_stated: string[]    // things the source says directly — verbatim-adjacent
}

// ── Main RegulatoryFile type ───────────────────────────────────────────────

export interface RegulatoryFile {
  id: string
  intelligence_item_id: string

  // 1. Source details (mirrored + enriched from IntelligenceItem)
  source_title: string
  source_url: string | null
  source_organisation: string
  publication_date: string | null
  regulatory_theme: string | null
  urgency: string | null
  action_required: string | null

  // 2. Source-grounded summary
  source_summary: SourceGroundedSummary

  // 3. Key operative points
  operative_points: OperativePoint[]

  // 4. Action triggers
  action_triggers: ActionTrigger[]

  // 5. Areas of ambiguity
  ambiguity_areas: AmbiguityArea[]

  // 6. External commentary
  external_commentary: ExternalCommentary[]
  commentary_status: 'not_searched' | 'search_ready' | 'partial' | 'complete'
  commentary_search_queries: string[]  // queries generated for future/live search

  // 7. Synthesis
  synthesis: RegFileSynthesis

  // 8. Ownership / governance implications
  ownership: OwnershipImplications

  // 9. Likely artefacts
  likely_artefacts: LikelyArtefact[]

  // 10. BankScope operational view
  bankscope_view: BankScopeView

  // Enrichment metadata
  enrichment_status: EnrichmentStatus
  enrichment_model: string | null        // e.g. 'gpt-4o'
  enriched_at: string | null
  enrichment_error: string | null
  created_at: string
  updated_at: string
}

// Insert shape (omit auto-generated fields)
export type RegulatoryFileInsert = Omit<
  RegulatoryFile,
  'id' | 'created_at' | 'updated_at'
>

// Lightweight summary for list/card display
export interface RegulatoryFileSummary {
  id: string
  intelligence_item_id: string
  enrichment_status: EnrichmentStatus
  enriched_at: string | null
  operative_points_count: number
  action_triggers_count: number
  commentary_count: number
  commentary_status: RegulatoryFile['commentary_status']
  created_at: string
}
