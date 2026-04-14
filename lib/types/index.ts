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
  priority_rationale: string | null  // 1-2 sentence explanation of the priority score
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

// AI summary output — what OpenAI returns (extended in migration-001)
export interface AISummaryOutput {
  summary: string
  affected_audience: string[]
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
  category_tag?: string
  audience?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
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
