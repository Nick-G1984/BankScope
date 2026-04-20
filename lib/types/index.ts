// Shared type definitions for BankScope Intelligence

export type SourceType = 'regulator' | 'government' | 'market' | 'news' | 'other'

export type ContentType =
  | 'press-release'
  | 'publication'
  | 'consultation'
  | 'speech'
  | 'policy-statement'
  | 'enforcement'
  | 'data'
  | 'news'
  | 'other'

export type Urgency = 'critical' | 'high' | 'medium' | 'low'

export type ConfidenceStatus = 'ai-generated' | 'reviewed' | 'pending'

export type IngestionStatus = 'running' | 'completed' | 'failed'

export type RegulatoryTheme =
  | 'conduct'
  | 'prudential'
  | 'consumer-duty'
  | 'complaints'
  | 'governance'
  | 'operational-resilience'
  | 'aml-fraud'
  | 'data-privacy'
  | 'market-competition'
  | 'other'

export type ActionRequired = 'yes' | 'monitor' | 'awareness'

// Core intelligence item — matches the Supabase table
export interface IntelligenceItem {
  id: string
  source_id: string                  // deduplication key
  title: string
  source_name: string                // e.g. "FCA", "Bank of England"
  source_type: SourceType
  content_type: ContentType
  publish_date: string | null        // ISO 8601
  source_url: string | null
  raw_excerpt: string | null
  ai_summary: string | null
  affected_audience: string[]        // e.g. ["banks", "building societies"]
  priority_score: number | null      // 1-10
  urgency: Urgency | null
  category_tags: string[]            // e.g. ["consumer duty", "CASS"]
  suggested_next_step: string | null
  // --- Added in migration-001 ---
  action_required: ActionRequired | null
  regulatory_theme: RegulatoryTheme | null
  deadline: string | null            // ISO date (YYYY-MM-DD) if a compliance deadline is mentioned
  priority_rationale: string | null  // 2-sentence explanation of the priority score
  // --- Added in migration-002 ---
  why_it_matters: string | null      // 1-2 sentence practical implication, distinct from summary
  affected_functions: string[]       // internal teams: compliance, risk, operations, change-management, etc.
  // ------------------------------
  confidence_status: ConfidenceStatus
  is_processed: boolean
  created_at: string
  updated_at: string
}

// Row insert shape (omit auto-generated fields)
export type IntelligenceItemInsert = Omit<IntelligenceItem, 'id' | 'created_at' | 'updated_at'>

// A raw item fetched from a source before AI processing
export interface RawSourceItem {
  source_id: string                  // stable deduplication key (hash or URL)
  title: string
  source_name: string
  source_type: SourceType
  content_type: ContentType
  publish_date: string | null
  source_url: string | null
  raw_excerpt: string | null
}

// Result returned by each source connector
export interface SourceResult {
  source_name: string
  items_fetched: number
  items_new: number
  errors: string[]
}

// Tracked ingestion run
export interface IngestionRun {
  id: string
  started_at: string
  completed_at: string | null
  status: IngestionStatus
  items_fetched: number
  items_new: number
  items_processed: number
  error_log: string | null
  source_results: SourceResult[] | null
}

// AI summary output — what OpenAI returns
export interface AISummaryOutput {
  summary: string
  why_it_matters: string
  affected_audience: string[]        // maps to affected_firm_types in prompt
  affected_functions: string[]
  urgency: Urgency
  suggested_next_step: string
  category_tags: string[]
  priority_score: number
  action_required: ActionRequired
  regulatory_theme: RegulatoryTheme
  deadline: string | null            // YYYY-MM-DD or null
  priority_rationale: string
}

// Filter/search params for the dashboard
export interface IntelligenceFilters {
  search?: string
  source_name?: string
  /**
   * Source group — filters to all sources belonging to a category.
   * Expands to an IN clause in the DB query.
   *   core_fs         → FCA, PRA, Bank of England, HM Treasury, PSR
   *   adjacent        → FOS, FSCS, ICO, Companies House
   *   sector_specific → TPR, ASA, Ofcom, Gambling Commission
   */
  source_group?: 'core_fs' | 'adjacent' | 'sector_specific'
  /**
   * Firm classification slug (e.g. 'ifa', 'mortgage_broker').
   * When set, takes precedence over source_group and source_name.
   * The DB layer looks up the classification's regulators array and expands
   * to an IN clause over source_name, so the feed is narrowed to relevant bodies.
   */
  firm_classification?: string
  urgency?: Urgency
  content_type?: ContentType
  regulatory_theme?: RegulatoryTheme
  category_tag?: string
  audience?: string
  // Multi-select filters (array overlap semantics — any match, available via API)
  firm_types?: string[]      // matches against affected_audience column
  product_areas?: string[]   // matches against category_tags column
  functions?: string[]       // matches against affected_functions column
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

// ============================================================
// OUTPUT GENERATION TYPES (Phase 2)
// ============================================================

export type OutputType =
  | 'delivery_brief'
  | 'compliance_pack'
  | 'governance_brief'
  | 'board_summary'
  | 'implementation_plan'

export const OUTPUT_TYPE_LABELS: Record<OutputType, string> = {
  delivery_brief: 'Delivery Brief',
  compliance_pack: 'Compliance Action Pack',
  governance_brief: 'Governance Brief',
  board_summary: 'Board Summary',
  implementation_plan: 'Implementation Plan',
}

export const OUTPUT_TYPE_DESCRIPTIONS: Record<OutputType, string> = {
  delivery_brief: 'What changed, key risks, owners, and immediate actions',
  compliance_pack: 'Obligations, controls, evidence, and attestations',
  governance_brief: 'Decision points, risk areas, and governance forums',
  board_summary: 'Executive summary, strategic relevance, and board questions',
  implementation_plan: 'Workstreams, milestones, RAID, and 30/60/90 day view',
}

// ── Content schemas for each premium output type ─────────────────────────────
//
// Design principles:
//  1. All new fields are optional so old stored outputs render without crashing.
//  2. `source_grounded_facts` = statements derivable from the source publication.
//  3. `ai_recommendations` / action fields = AI-suggested, must be labelled as such.
//  4. Every type carries `document_purpose` and `confidence_note`.

export interface DeliveryBriefContent {
  // v2 enriched fields
  document_purpose?: string          // one sentence: what this doc is for
  executive_summary?: string         // 2–3 sentence intro
  source_grounded_facts?: string[]   // explicitly from the source publication
  // core fields (original + v2)
  what_changed: string
  why_it_matters: string
  affected_areas: string[]
  key_risks: Array<
    | string
    | { risk: string; likelihood?: string; impact?: string }
  >
  recommended_owners: Array<{
    role: string
    responsibility: string
    timeframe?: string
  }>
  immediate_actions: string[]
  suggested_timeline: string
  confidence_note: string
}

export interface CompliancePackContent {
  document_purpose?: string
  regulatory_obligations: string[]
  policies_impacted: string[]
  controls_to_review: string[]
  evidence_required: string[]
  suggested_attestations: string[]
  monitoring_actions: string[]
  compliance_deadline?: string | null
  confidence_note: string
}

export interface GovernanceBriefContent {
  document_purpose?: string
  executive_summary?: string
  decision_points: Array<
    | string
    | { decision: string; forum?: string; urgency?: string }
  >
  risk_areas: string[]
  dependencies: string[]
  required_governance_forums: string[]
  escalation_considerations: string[]
  reporting_cadence?: string
  confidence_note: string
}

export interface BoardSummaryContent {
  document_purpose?: string
  executive_summary: string
  strategic_relevance: string
  regulatory_exposure: string
  management_response?: string       // what management is doing / plans to do
  key_decisions_required: string[]
  board_questions: string[]
  confidence_note: string
}

export interface ImplementationPlanContent {
  document_purpose?: string
  programme_overview?: string
  workstreams: Array<{
    name: string
    description: string
    owner_role: string
    key_deliverables?: string[]
  }>
  milestones: Array<{
    milestone: string
    timeframe: string
    phase: string
    owner?: string
  }>
  raid: {
    risks: Array<string | { description: string; mitigation?: string }>
    assumptions: string[]
    issues: string[]
    dependencies: string[]
  }
  delivery_phases: {
    days_0_30: string[]
    days_31_60: string[]
    days_61_90: string[]
  }
  governance_and_reporting?: string
  success_criteria?: string[]
  confidence_note: string
}

export type OutputContent =
  | DeliveryBriefContent
  | CompliancePackContent
  | GovernanceBriefContent
  | BoardSummaryContent
  | ImplementationPlanContent

export interface GeneratedOutput {
  id: string
  user_id: string
  intelligence_item_id: string
  output_type: OutputType
  title: string
  content: OutputContent
  source_item_title: string | null
  source_item_url: string | null
  source_name: string | null
  credits_used: number
  created_at: string
}

// ============================================================
// AUTH / USER TYPES
// ============================================================

export type PlanTier = 'free' | 'pro' | 'enterprise'

export interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  organisation: string | null
  credit_balance: number
  plan: PlanTier
  created_at: string
  updated_at: string
}

export interface CreditTransaction {
  id: string
  user_id: string
  amount: number
  reason: 'signup_bonus' | 'output_generated' | 'purchase' | 'admin_grant' | 'refund'
  output_id: string | null
  note: string | null
  created_at: string
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

// Registered data source
export interface DataSource {
  id: string
  name: string
  source_type: SourceType
  url: string
  is_active: boolean
  last_fetched: string | null
  fetch_frequency: string
  created_at: string
}

// Email signup
export interface EmailSignup {
  id: string
  email: string
  created_at: string
}

// Dashboard stats — returned by getDashboardStats()
export interface DashboardStats {
  total_items: number
  unprocessed: number
  today_items: number
  sources_active: number
}

// ============================================================
// FIRM CLASSIFICATION TYPES (Phase 3)
// ============================================================

/**
 * AI-generated scope summary stored in firm_classifications.scope_summary.
 * All fields are optional so partially-generated summaries render safely.
 */
export interface ScopeSummary {
  high_level_overview: string
  key_regulations: string[]
  key_regulators: string[]
  compliance_tasks: string[]
  suggested_deliverables: string[]
}

/** Matches the firm_classifications DB table */
export interface FirmClassification {
  id: string
  slug: string
  name: string
  description: string
  services: string[]
  regulators: string[]          // source_name values, e.g. 'FCA', 'ICO'
  obligations: string[]         // legislative frameworks, e.g. 'SMCR', 'Consumer Duty'
  scope_summary: ScopeSummary | null
  scope_enriched_at: string | null  // ISO 8601
  created_at: string
  updated_at: string
}

/** Slim version for dropdowns — avoids fetching heavy scope_summary */
export interface FirmClassificationStub {
  id: string
  slug: string
  name: string
  description: string
  regulators: string[]
}

export type ComplianceTaskStatus = 'todo' | 'in_progress' | 'done'

/** Matches the compliance_tasks DB table */
export interface ComplianceTask {
  id: string
  user_id: string
  classification_id: string
  task: string
  status: ComplianceTaskStatus
  due_date: string | null   // ISO date YYYY-MM-DD
  created_at: string
  updated_at: string
}

export type ComplianceTaskInsert = Pick<
  ComplianceTask,
  'classification_id' | 'task' | 'status' | 'due_date'
>
