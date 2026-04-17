/**
 * Candidate relevance scoring engine.
 *
 * Scores each search result against the regulatory item using multiple
 * independent dimensions. A candidate must reach a per-query-tier threshold
 * to proceed to the expensive content-fetch step.
 *
 * Design principle: false positives are worse than missing commentary.
 * When in doubt, reject.
 *
 * ── Scoring dimensions ────────────────────────────────────────────────────
 *
 *   exact_identifier_match   (0.30) — title/snippet contains same CP/PS/SS ref
 *   regulator_match          (0.15) — source regulator appears in content
 *   title_keyword_overlap    (0.20) — keyword overlap between item title and result title
 *   initiative_match         (0.15) — known initiative name found in content
 *   date_proximity           (0.10) — result appears to post-date the item
 *   content_specificity      (0.10) — signals of interpretive commentary vs generic content
 *
 * Total possible: 1.0
 *
 * Hard rejection conditions (bypass scoring):
 *   - Domain does not match the expected trusted source
 *   - Result appears to be about a clearly different regulator
 *   - Result title contains hard-rejection signals (job listing, cookie policy, etc.)
 *
 * ── Tier-specific thresholds ──────────────────────────────────────────────
 *
 *   identifier tier: 0.55   (identifier match already contributes 0.30)
 *   exact_title tier: 0.60
 *   initiative_name tier: 0.70 (lowest precision tier, needs more corroboration)
 */

import type { IntelligenceItem } from '../types'
import type { SearchResult } from './search-commentary'
import type { TrustedSource } from './trusted-sources'
import type { QueryTier } from './build-commentary-queries'
import { DOCUMENT_ID_PATTERN_GLOBAL } from './build-commentary-queries'

// Re-export pattern for use in this module
const ID_PATTERN = DOCUMENT_ID_PATTERN_GLOBAL

export interface DimensionScores {
  exact_identifier_match: boolean
  regulator_match: boolean
  title_keyword_overlap: 'strong' | 'moderate' | 'weak'
  initiative_match: boolean
  date_proximity: 'after' | 'contemporaneous' | 'before' | 'unknown'
  content_specificity: 'high' | 'medium' | 'low'
}

export interface CandidateScore {
  score: number             // 0.0 – 1.0
  accepted: boolean
  tier: QueryTier
  dimension_scores: DimensionScores
  /** Human-readable summary of why accepted or rejected */
  reasoning: string
  rejection_reason?: string
}

// ── Hard rejection signals ─────────────────────────────────────────────────

const HARD_REJECT_TITLE_PATTERNS: RegExp[] = [
  /job(s| listing| posting| opening)/i,
  /careers? at /i,
  /cookie policy/i,
  /privacy policy/i,
  /terms (and|&|of) (service|use)/i,
  /contact us/i,
  /login|sign in|register/i,
  /404|page not found/i,
  /press release:\s*(?:Q[1-4]|results|earnings)/i, // financial results, not regulatory
]

const HARD_REJECT_URL_PATTERNS: RegExp[] = [
  /\/jobs?\//i,
  /\/careers?\//i,
  /\/privacy/i,
  /\/cookies/i,
  /\/terms/i,
  /\/contact/i,
  /\/login/i,
  /\/search\?/i,  // Search result pages
]

// Known regulators to detect domain mismatch (e.g. FCA result on KPMG query)
const REGULATOR_NAMES: Record<string, string[]> = {
  'financial conduct authority': ['fca', 'financial conduct authority'],
  'prudential regulation authority': ['pra', 'prudential regulation authority'],
  'bank of england': ['bank of england', 'boe'],
  'payment systems regulator': ['psr', 'payment systems regulator'],
  'financial ombudsman service': ['fos', 'financial ombudsman'],
  'competition and markets authority': ['cma'],
}

// Signals that a snippet represents interpretive commentary
const SPECIFICITY_SIGNALS: string[] = [
  'implications for',
  'what firms need to',
  'key changes',
  'what this means',
  'regulatory requirements',
  'compliance implications',
  'implementation',
  'firms should',
  'firms must',
  'action required',
  'policy statement',
  'consultation paper',
  'guidance note',
  'regulatory update',
  'our analysis',
  'key takeaways',
  'key points',
  'what you need to know',
  'in response to',
  'following the',
  'in light of',
  'following publication',
]

// ── Stop words for keyword overlap calculation ─────────────────────────────

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'that', 'this',
  'have', 'been', 'will', 'which', 'about', 'their', 'more',
  'new', 'its', 'are', 'was', 'were', 'not', 'but', 'they',
  'our', 'has', 'can', 'may', 'also', 'your', 'all', 'how',
])

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-–—,.:;()/]+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
}

// ── Year extraction ────────────────────────────────────────────────────────

function extractYearsFromText(text: string): number[] {
  const matches = text.match(/\b(20[0-9]{2})\b/g) ?? []
  return Array.from(new Set(matches.map(Number)))
}

// ── Main scoring function ──────────────────────────────────────────────────

export function scoreCandidate(
  result: SearchResult,
  item: IntelligenceItem,
  trustedSource: TrustedSource,
  tier: QueryTier,
  tierMinScore: number,
): CandidateScore {
  const titleLower = (result.title ?? '').toLowerCase()
  const snippetLower = (result.snippet ?? '').toLowerCase()
  const combined = titleLower + ' ' + snippetLower

  // ── Hard rejections ──────────────────────────────────────────────────────

  // 1. Domain must belong to the intended trusted source
  const domainMatches =
    result.domain === trustedSource.domain ||
    result.domain.endsWith(`.${trustedSource.domain}`)
  if (!domainMatches) {
    return reject(
      0,
      tier,
      `Domain mismatch: expected *.${trustedSource.domain}, got ${result.domain}`,
      buildDimensions()
    )
  }

  // 2. Title pattern hard rejects
  for (const pattern of HARD_REJECT_TITLE_PATTERNS) {
    if (pattern.test(result.title)) {
      return reject(0, tier, `Hard reject — title pattern: ${pattern}`, buildDimensions())
    }
  }

  // 3. URL pattern hard rejects
  for (const pattern of HARD_REJECT_URL_PATTERNS) {
    if (pattern.test(result.url)) {
      return reject(0, tier, `Hard reject — URL pattern: ${pattern}`, buildDimensions())
    }
  }

  // ── Dimensional scoring ──────────────────────────────────────────────────

  let score = 0
  const dims = buildDimensions()

  // Dimension 1: Exact document identifier match (weight: 0.30)
  const itemIds = (item.title.match(ID_PATTERN) ?? [])
    .map((s) => s.replace(/\s/g, '').toUpperCase())
  const resultIds = (combined.match(ID_PATTERN) ?? [])
    .map((s) => s.replace(/\s/g, '').toUpperCase())

  if (itemIds.length > 0 && itemIds.some((id) => resultIds.includes(id))) {
    dims.exact_identifier_match = true
    score += 0.30
  }

  // Dimension 2: Regulator name match (weight: 0.15 full, 0.10 abbreviation)
  const regLower = item.source_name.toLowerCase()
  const regAliases = REGULATOR_NAMES[regLower] ?? [regLower]

  if (regAliases.some((alias) => combined.includes(alias))) {
    dims.regulator_match = true
    // Full name match is stronger evidence than abbreviation
    if (combined.includes(regLower)) {
      score += 0.15
    } else {
      score += 0.10 // Abbreviation match
    }
  }

  // Dimension 3: Title keyword overlap (weight: 0.20 / 0.10)
  const itemKeywords = extractKeywords(item.title)
  if (itemKeywords.length > 0) {
    const matching = itemKeywords.filter((kw) => titleLower.includes(kw))
    const overlap = matching.length / itemKeywords.length

    if (overlap >= 0.40) {
      dims.title_keyword_overlap = 'strong'
      score += 0.20
    } else if (overlap >= 0.20) {
      dims.title_keyword_overlap = 'moderate'
      score += 0.10
    }
    // else: weak, no points
  }

  // Dimension 4: Initiative / framework name match (weight: 0.15)
  const initiativeTerms = [
    ...(item.category_tags ?? []),
    item.regulatory_theme ?? '',
  ]
    .join(' ')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 5)

  if (initiativeTerms.some((term) => combined.includes(term))) {
    dims.initiative_match = true
    score += 0.15
  }

  // Dimension 5: Date proximity (weight: +0.10 / -0.10)
  const itemYear = item.publish_date
    ? new Date(item.publish_date).getFullYear()
    : null

  if (itemYear) {
    const years = extractYearsFromText(combined)
    if (years.length > 0) {
      const maxYear = Math.max(...years)
      if (maxYear >= itemYear) {
        dims.date_proximity = 'after'
        score += 0.10
      } else if (maxYear === itemYear - 1) {
        // Preceding year — likely preparatory / consultative commentary
        dims.date_proximity = 'contemporaneous'
        score += 0.05
      } else {
        // Content predates the publication by 2+ years — suspicious
        dims.date_proximity = 'before'
        score -= 0.10
      }
    }
  }

  // Dimension 6: Content specificity (weight: 0.10 / 0.05)
  const specificityHits = SPECIFICITY_SIGNALS.filter((signal) =>
    combined.includes(signal)
  )
  if (specificityHits.length >= 3) {
    dims.content_specificity = 'high'
    score += 0.10
  } else if (specificityHits.length >= 1) {
    dims.content_specificity = 'medium'
    score += 0.05
  }

  // ── Threshold gate ───────────────────────────────────────────────────────

  const finalScore = Math.max(0, Math.min(1, score))
  const accepted = finalScore >= tierMinScore

  if (!accepted) {
    return reject(
      finalScore,
      tier,
      [
        `Score ${finalScore.toFixed(2)} below tier-${tier} threshold ${tierMinScore}`,
        `identifier=${dims.exact_identifier_match}`,
        `regulator=${dims.regulator_match}`,
        `title_overlap=${dims.title_keyword_overlap}`,
        `initiative=${dims.initiative_match}`,
        `date=${dims.date_proximity}`,
        `specificity=${dims.content_specificity}`,
      ].join(' | '),
      dims
    )
  }

  return {
    score: finalScore,
    accepted: true,
    tier,
    dimension_scores: dims,
    reasoning: [
      `Accepted (score=${finalScore.toFixed(2)}, threshold=${tierMinScore})`,
      `identifier=${dims.exact_identifier_match}`,
      `regulator=${dims.regulator_match}`,
      `title=${dims.title_keyword_overlap}`,
      `initiative=${dims.initiative_match}`,
      `date=${dims.date_proximity}`,
      `specificity=${dims.content_specificity}`,
    ].join(' | '),
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildDimensions(): DimensionScores {
  return {
    exact_identifier_match: false,
    regulator_match: false,
    title_keyword_overlap: 'weak',
    initiative_match: false,
    date_proximity: 'unknown',
    content_specificity: 'low',
  }
}

function reject(
  score: number,
  tier: QueryTier,
  reason: string,
  dims: DimensionScores
): CandidateScore {
  return {
    score,
    accepted: false,
    tier,
    dimension_scores: dims,
    reasoning: `Rejected: ${reason}`,
    rejection_reason: reason,
  }
}
