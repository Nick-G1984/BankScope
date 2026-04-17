/**
 * Commentary query builder.
 *
 * Generates precise, anchor-rich search queries for each trusted source.
 * The goal is to find commentary on the EXACT publication or EXACT
 * regulatory development — not vaguely related topic coverage.
 *
 * Query construction strategy:
 *   1. Extract the strongest anchors from the item (identifiers, title phrases,
 *      initiative names, regulator name, year)
 *   2. Per trusted source, build 1–3 queries at decreasing specificity:
 *        - Tier 1: exact identifier (CP24/2, PS23/5 etc.) + regulator + site:
 *        - Tier 2: quoted title fragment + regulator + site:
 *        - Tier 3: initiative name + regulator + year + site:
 *   3. Cap total queries to control API cost
 *
 * Tier 1 queries are only run if a document identifier is present.
 * Tier 3 queries are run for all sources but treated as lower-confidence
 * leads that require higher validation scores to pass.
 */

import type { IntelligenceItem } from '../types'
import { TRUSTED_SOURCES, type TrustedSource } from './trusted-sources'

// ── Types ──────────────────────────────────────────────────────────────────

export type QueryTier = 'identifier' | 'exact_title' | 'initiative_name'

export interface CommentaryQuery {
  query: string
  target_source: TrustedSource
  tier: QueryTier
  /** Minimum acceptance score required for results from this query tier */
  min_score_required: number
}

// ── Regex patterns ─────────────────────────────────────────────────────────

/**
 * Matches FCA/PRA document identifiers:
 *   CP24/2, PS23/5, SS1/21, FG22/5, TR24/1, DP23/4, GC23/2
 *   PRA/PS7/24, PRA/CP5/23, BS24/1
 *
 * Exported so scoring and extraction modules can reuse the same pattern.
 * Note: the `g` flag means each call to .match() creates a fresh exec loop
 * from index 0 — safe to share as long as callers do not use .exec().
 */
export const DOCUMENT_ID_PATTERN_GLOBAL =
  /\b(?:FCA\/)?(?:CP|PS|SS|FG|TR|DP|GC|BS|SR|PRA\/PS|PRA\/CP|PRA\/SS)\s?\d+\/\d+\b/gi

/**
 * Known named regulatory initiatives, regimes, and frameworks.
 * Ordered longest-match first to avoid partial matches.
 * Extend this list as new major regimes emerge.
 */
const KNOWN_INITIATIVES: string[] = [
  'Consumer Duty',
  'Consumer Composite Investments',
  'Basel 3.1',
  'Basel III',
  'DORA',
  'Digital Operational Resilience',
  'APP fraud reimbursement',
  'APP Fraud',
  'Edinburgh Reforms',
  'Smarter Regulatory Framework',
  'SDDT',
  'Sustainability Disclosure Requirements',
  'SDR',
  'anti-greenwashing',
  'Solvency II',
  'Solvency UK',
  'MiFID',
  'MiFIR',
  'IFRS 17',
  'IFRS 9',
  'Strong Customer Authentication',
  'SCA',
  'Open Banking',
  'Open Finance',
  'BNPL',
  'Buy Now Pay Later',
  'crypto-asset',
  'cryptoasset',
  'crypto asset',
  'TCFD',
  'Task Force on Climate-related Financial Disclosures',
  'operational resilience',
  'systemic risk',
  'resolution planning',
  'MREL',
  'motor finance',
  'Consumer Credit Act',
  'Consumer Credit',
  'SM&CR',
  'SMCR',
  'Senior Managers',
  'ring-fencing',
  'payment services',
  'Faster Payments',
  'credit unions',
  'mortgage prisoners',
  'Appointed Representatives',
  'AR regime',
  'financial promotions',
  'ESG',
  'net zero',
  'CRDVI',
  'CRD VI',
  'CRR3',
  'CRR III',
  'interest rate risk',
  'IRRBB',
  'liquidity coverage ratio',
  'LCR',
  'net stable funding ratio',
  'NSFR',
]

// ── Anchor extraction ──────────────────────────────────────────────────────

export interface ItemAnchors {
  /** Raw document identifiers found in title (CP24/2, PS23/5, etc.) */
  identifiers: string[]
  /** Exact publication title */
  exact_title: string
  /**
   * Best title fragment for a quoted phrase search.
   * Uses first 55 chars, trimmed to the last complete word.
   */
  title_fragment: string
  /** Name of the source organisation */
  regulator: string
  /** Short regulator abbreviation if known (FCA, PRA, BoE, PSR) */
  regulator_short: string | null
  /** Matched known initiative names */
  initiative_names: string[]
  /** Publication year as string, or null */
  year: string | null
}

const REGULATOR_ABBREVIATIONS: Record<string, string> = {
  'financial conduct authority': 'FCA',
  'prudential regulation authority': 'PRA',
  'bank of england': 'BoE',
  'payment systems regulator': 'PSR',
  'financial ombudsman service': 'FOS',
  'competition and markets authority': 'CMA',
  'information commissioner': 'ICO',
  'prudential regulatory authority': 'PRA',
}

export function extractAnchors(item: IntelligenceItem): ItemAnchors {
  const titleLower = item.title.toLowerCase()
  const summaryLower = (item.ai_summary ?? '').toLowerCase()
  const combined = titleLower + ' ' + summaryLower

  // Extract document identifiers
  const idMatches = (item.title.match(DOCUMENT_ID_PATTERN_GLOBAL) ?? []).map((id) =>
    id.replace(/\s/g, '').toUpperCase()
  )
  const identifiers = Array.from(new Set(idMatches))

  // Build title fragment (≤55 chars, breaks on last complete word)
  const rawFragment = item.title.slice(0, 55)
  const lastSpace = rawFragment.lastIndexOf(' ')
  const title_fragment = lastSpace > 20 ? rawFragment.slice(0, lastSpace) : rawFragment

  // Regulator abbreviation
  const regLower = item.source_name.toLowerCase()
  const regulator_short = REGULATOR_ABBREVIATIONS[regLower] ?? null

  // Extract initiative names (longest match wins, deduplicate)
  const initiative_names: string[] = []
  for (const initiative of KNOWN_INITIATIVES) {
    if (combined.includes(initiative.toLowerCase())) {
      // Skip if a longer initiative already covers this text
      const alreadyCovered = initiative_names.some(
        (existing) =>
          existing.toLowerCase().includes(initiative.toLowerCase()) ||
          initiative.toLowerCase().includes(existing.toLowerCase())
      )
      if (!alreadyCovered) {
        initiative_names.push(initiative)
      }
    }
  }

  // Also add category tags as potential initiative anchors (up to 2)
  if (item.category_tags) {
    for (const tag of item.category_tags.slice(0, 2)) {
      if (tag.length > 5 && !initiative_names.includes(tag)) {
        initiative_names.push(tag)
      }
    }
  }

  const year = item.publish_date
    ? String(new Date(item.publish_date).getFullYear())
    : null

  return {
    identifiers,
    exact_title: item.title,
    title_fragment,
    regulator: item.source_name,
    regulator_short,
    initiative_names: initiative_names.slice(0, 3), // cap at 3
    year,
  }
}

// ── Query builder ──────────────────────────────────────────────────────────

/**
 * Builds an ordered list of search queries for commentary enrichment.
 *
 * Ordering: Tier 1 (identifier) > Tier 2 (exact title) > Tier 3 (initiative).
 * Within each tier: Big4 > law firms > industry bodies.
 *
 * The returned list is capped at MAX_QUERIES to control API costs.
 * Callers should process in order and stop when MAX_ACCEPTED is reached.
 */
export function buildCommentaryQueries(
  item: IntelligenceItem,
  options: { maxQueries?: number } = {}
): CommentaryQuery[] {
  const { maxQueries = 24 } = options
  const anchors = extractAnchors(item)
  const queries: CommentaryQuery[] = []

  // Sources in priority order
  const sources = [...TRUSTED_SOURCES].sort((a, b) => a.priority - b.priority)

  for (const source of sources) {
    const sitePrefix = `site:${source.domain}`
    const regStr = anchors.regulator_short ?? anchors.regulator

    // ── Tier 1: Document identifier (highest precision) ──────────────────
    // Only generated when a formal doc ID is present (CP24/2 etc.)
    for (const id of anchors.identifiers.slice(0, 1)) {
      queries.push({
        query: `${sitePrefix} "${id}" ${regStr}`.trim(),
        target_source: source,
        tier: 'identifier',
        min_score_required: 0.55, // Lower bar — identifier match is very strong signal
      })
    }

    // ── Tier 2: Quoted title fragment ────────────────────────────────────
    if (anchors.title_fragment.length > 15) {
      const yearStr = anchors.year ? ` ${anchors.year}` : ''
      queries.push({
        query: `${sitePrefix} "${anchors.title_fragment}" ${regStr}${yearStr}`.trim(),
        target_source: source,
        tier: 'exact_title',
        min_score_required: 0.60,
      })
    }

    // ── Tier 3: Initiative name (broader, requires higher score) ─────────
    for (const initiative of anchors.initiative_names.slice(0, 1)) {
      const yearStr = anchors.year ? ` ${anchors.year}` : ''
      queries.push({
        query: `${sitePrefix} "${initiative}" ${regStr} regulatory${yearStr}`.trim(),
        target_source: source,
        tier: 'initiative_name',
        min_score_required: 0.70, // Higher threshold — initiative queries are less precise
      })
    }
  }

  // Deduplicate on query string
  const seen = new Set<string>()
  return queries
    .filter((q) => {
      if (seen.has(q.query)) return false
      seen.add(q.query)
      return true
    })
    .slice(0, maxQueries)
}