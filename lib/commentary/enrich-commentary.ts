/**
 * Commentary enrichment pipeline — Phase 2.
 *
 * Orchestrates the full retrieval flow:
 *
 *   1. Check if the item is eligible for commentary enrichment
 *   2. Check that a search backend is configured
 *   3. Generate targeted search queries (build-commentary-queries)
 *   4. Execute queries against the search backend (search-commentary)
 *   5. Gate 1 — filter by trusted domain allowlist
 *   6. Gate 2 — relevance scoring (score-commentary-candidate)
 *   7. Gate 3 — content fetch + AI extraction (fetch-commentary-content)
 *   8. Final rejection if extraction fails or content is off-topic
 *   9. Return accepted commentary and rejected candidate log
 *
 * Precision controls:
 *   - MAX_ACCEPTED (4) — never flood the dossier with marginal results
 *   - MAX_QUERIES (20) — controls API spend; enough queries to cover
 *     all sources at Tier 1 + Tier 2
 *   - Per-tier min_score thresholds — see score-commentary-candidate
 *   - Deduplication on normalised URL (strip tracking params)
 *
 * Eligibility check:
 *   Commentary enrichment is not free (search API + page fetch + GPT-4o-mini).
 *   By default, only run on items that are clearly worth the cost:
 *   high urgency, high priority score, action required, or specific
 *   high-value content types. This can be overridden by the caller
 *   (e.g. when the user explicitly requests deep analysis).
 */

import type { IntelligenceItem } from '../types'
import type { ExternalCommentary } from '../types/regulatory-file'
import { buildCommentaryQueries, extractAnchors } from './build-commentary-queries'
import { executeSearch, getSearchBackend } from './search-commentary'
import { isDomainTrusted, getTrustedSourceForUrl } from './trusted-sources'
import { scoreCandidate } from './score-commentary-candidate'
import { extractCommentaryContent } from './fetch-commentary-content'

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_ACCEPTED = 4      // Maximum commentary items to store
const MAX_QUERIES = 20      // Maximum search queries to execute

// ── Types ──────────────────────────────────────────────────────────────────

export interface RejectedCandidate {
  url: string
  title: string
  domain: string
  rejection_stage: 'domain_not_trusted' | 'score_below_threshold' | 'extraction_failed'
  rejection_reason: string
  score: number
}

export interface CommentaryEnrichmentResult {
  commentary: ExternalCommentary[]
  rejected_candidates: RejectedCandidate[]
  commentary_status: 'complete' | 'partial' | 'search_ready'
  queries_run: string[]
  search_backend: string
  total_candidates_evaluated: number
  total_accepted: number
  total_rejected: number
  enrichment_duration_ms: number
}

export interface CommentaryEnrichmentError {
  code:
    | 'search_not_configured'
    | 'item_not_eligible'
    | 'no_anchors'
    | 'search_failed'
  message: string
}

// ── Eligibility check ──────────────────────────────────────────────────────

/** Content types that are high-value enough to warrant commentary enrichment. */
const ELIGIBLE_CONTENT_TYPES = new Set([
  'policy_statement',
  'consultation_paper',
  'dear_ceo_letter',
  'dear_ceo',
  'guidance',
  'supervisory_statement',
  'speech',
  'discussion_paper',
  'regulatory_update',
  'final_rules',
  'near_final_rules',
  'thematic_review',
  'multi_firm_review',
  'regulatory_statement',
])

export function isEligibleForCommentaryEnrichment(item: IntelligenceItem): boolean {
  if (item.urgency === 'critical') return true
  if (item.urgency === 'high') return true
  if (item.action_required === 'yes') return true
  if (item.priority_score != null && item.priority_score >= 7) return true
  if (
    item.content_type &&
    ELIGIBLE_CONTENT_TYPES.has(item.content_type.toLowerCase().replace(/\s/g, '_'))
  ) {
    return true
  }
  return false
}

// ── Item context builder ───────────────────────────────────────────────────

function buildItemContext(item: IntelligenceItem): string {
  return [
    `Title: ${item.title}`,
    `Regulator: ${item.source_name}`,
    `Content type: ${item.content_type ?? 'not specified'}`,
    item.publish_date ? `Published: ${item.publish_date}` : '',
    item.regulatory_theme ? `Theme: ${item.regulatory_theme}` : '',
    item.ai_summary ? `Summary: ${item.ai_summary}` : '',
    item.category_tags?.length
      ? `Tags: ${item.category_tags.join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

// ── URL normalisation ──────────────────────────────────────────────────────

/** Strip UTM params and common tracking suffixes from URLs for deduplication. */
function normaliseUrl(url: string): string {
  try {
    const u = new URL(url)
    // Remove tracking params
    for (const key of Array.from(u.searchParams.keys())) {
      if (
        key.startsWith('utm_') ||
        key.startsWith('ref') ||
        ['source', 'medium', 'campaign', 'content', 'term'].includes(key)
      ) {
        u.searchParams.delete(key)
      }
    }
    // Normalise trailing slash
    return u.toString().replace(/\/$/, '')
  } catch {
    return url
  }
}

// ── Main pipeline ──────────────────────────────────────────────────────────

export async function enrichCommentary(
  item: IntelligenceItem,
  options: { forceEligible?: boolean } = {}
): Promise<CommentaryEnrichmentResult | CommentaryEnrichmentError> {
  const startTime = Date.now()

  // 1. Eligibility check
  if (!options.forceEligible && !isEligibleForCommentaryEnrichment(item)) {
    return {
      code: 'item_not_eligible',
      message:
        'Item does not meet commentary enrichment criteria (urgency, priority, content type). ' +
        'Pass forceEligible: true to override.',
    }
  }

  // 2. Search backend check
  const searchBackend = getSearchBackend()
  if (!searchBackend) {
    return {
      code: 'search_not_configured',
      message:
        'No search API configured. Set TAVILY_API_KEY (preferred) or BING_SEARCH_API_KEY.',
    }
  }

  // 3. Verify item has enough anchors to generate useful queries
  const anchors = extractAnchors(item)
  if (!anchors.exact_title || anchors.exact_title.length < 10) {
    return {
      code: 'no_anchors',
      message: 'Item has insufficient title/anchor data to generate targeted queries.',
    }
  }

  // 4. Generate queries
  const queries = buildCommentaryQueries(item, { maxQueries: MAX_QUERIES })

  const queriesRun: string[] = []
  const accepted: ExternalCommentary[] = []
  const rejected: RejectedCandidate[] = []
  const seenUrls = new Set<string>()

  const itemContext = buildItemContext(item)

  // 5. Process queries in order (identifier → exact_title → initiative_name)
  for (const queryItem of queries) {
    if (accepted.length >= MAX_ACCEPTED) break

    let searchResults
    try {
      searchResults = await executeSearch(queryItem.query)
      queriesRun.push(queryItem.query)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[enrich-commentary] Search failed for query: "${queryItem.query}": ${msg}`)
      // Don't abort — continue with remaining queries
      continue
    }

    for (const result of searchResults) {
      if (accepted.length >= MAX_ACCEPTED) break

      // Deduplicate
      const normUrl = normaliseUrl(result.url)
      if (seenUrls.has(normUrl)) continue
      seenUrls.add(normUrl)

      // Gate 1: Domain allowlist
      if (!isDomainTrusted(result.url)) {
        rejected.push({
          url: result.url,
          title: result.title,
          domain: result.domain,
          rejection_stage: 'domain_not_trusted',
          rejection_reason: `Domain "${result.domain}" is not in the trusted allowlist`,
          score: 0,
        })
        continue
      }

      const trustedSource = getTrustedSourceForUrl(result.url)
      if (!trustedSource) continue // Should not happen given isDomainTrusted check above

      // Gate 2: Relevance scoring
      const scored = scoreCandidate(
        result,
        item,
        trustedSource,
        queryItem.tier,
        queryItem.min_score_required
      )

      if (!scored.accepted) {
        rejected.push({
          url: result.url,
          title: result.title,
          domain: result.domain,
          rejection_stage: 'score_below_threshold',
          rejection_reason: scored.rejection_reason ?? 'Score below threshold',
          score: scored.score,
        })
        continue
      }

      // Gate 3: Content fetch + AI extraction
      // Pass Tavily's raw_content if available to avoid an extra HTTP request
      const extracted = await extractCommentaryContent(
        result.url,
        result.title,
        itemContext,
        result.raw_content
      )

      if (!extracted.extraction_succeeded) {
        rejected.push({
          url: result.url,
          title: result.title,
          domain: result.domain,
          rejection_stage: 'extraction_failed',
          rejection_reason: extracted.extraction_error ?? 'Content extraction failed',
          score: scored.score,
        })
        continue
      }

      // All gates passed — build the verified commentary entry
      const confidenceScore = scored.score
      const confidenceLabel: ExternalCommentary['confidence'] =
        confidenceScore >= 0.85 ? 'high' : confidenceScore >= 0.70 ? 'medium' : 'low'

      const entry: ExternalCommentary = {
        source_name: trustedSource.name,
        source_domain: trustedSource.domain,
        source_url: result.url,
        publication_title: extracted.title || result.title,
        publication_date: extracted.publication_date,
        retrieved_excerpt: extracted.retrieved_excerpt,
        summary: extracted.summary,
        reinforces_source: extracted.reinforces_source,
        introduces_caution: extracted.introduces_caution,
        key_points: extracted.key_points,
        source_category: trustedSource.category,
        attribution: 'fetched',
        verified: true,
        confidence: confidenceLabel,
        commentary_confidence_score: confidenceScore,
        retrieval_reasoning: scored.reasoning,
      }

      accepted.push(entry)
    }
  }

  const commentary_status: CommentaryEnrichmentResult['commentary_status'] =
    accepted.length > 0 ? 'complete' : 'search_ready'

  return {
    commentary: accepted,
    rejected_candidates: rejected,
    commentary_status,
    queries_run: queriesRun,
    search_backend: searchBackend,
    total_candidates_evaluated: seenUrls.size,
    total_accepted: accepted.length,
    total_rejected: rejected.length,
    enrichment_duration_ms: Date.now() - startTime,
  }
}

/** Type guard to distinguish result from error */
export function isEnrichmentError(
  result: CommentaryEnrichmentResult | CommentaryEnrichmentError
): result is CommentaryEnrichmentError {
  return 'code' in result
}
