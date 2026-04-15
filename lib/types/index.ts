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

// Content shapes for each output type
export interface DeliveryBriefContent {
  what_changed: string
  why_it_matters: string
  affected_areas: string[]
  key_risks: string[]
  recommended_owners: { role: string; responsibility: string }[]
  immediate_actions: string[]
  suggested_timeline: string
  confidence_note: string
}

export interface CompliancePackContent {
  regulatory_obligations: string[]
  policies_impacted: string[]
  controls_to_review: string[]
  evidence_required: string[]
  suggested_attestations: string[]
  monitoring_actions: string[]
  confidence_note: string
}

export interface GovernanceBriefContent {
  decision_points: string[]
  risk_areas: string[]
  dependencies: string[]
  required_governance_forums: string[]
  escalation_considerations: string[]
  confidence_note: string
}

export interface BoardSummaryContent {
  executive_summary: string
  strategic_relevance: string
  regulatory_exposure: string
  key_decisions_required: string[]
  board_questions: string[]
  confidence_note: string
}

export interface ImplementationPlanContent {
  workstreams: { name: string; description: string; owner_role: string }[]
  milestones: { milestone: string; timeframe: string; phase: string }[]
  raid: {
    risks: string[]
    assumptions: string[]
    issues: string[]
    dependencies: string[]
  }
  delivery_phases: {
    days_0_30: string[]
    days_31_60: string[]
    days_61_90: string[]
  }
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
