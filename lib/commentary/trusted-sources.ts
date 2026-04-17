/**
 * Trusted source allowlist for verified commentary enrichment.
 *
 * This is the gating layer. Commentary is only ever accepted from domains
 * on this list. Adding a domain here is an explicit editorial decision.
 *
 * Source categories:
 *   big4            — Deloitte, KPMG, PwC, EY
 *   law_firm        — Major UK FS regulatory law firms
 *   regulator_followup — FCA, PRA, BoE follow-up publications
 *   industry_body   — UK Finance, TheCityUK, BSA, ABI
 *
 * insight_path_hints: URL path segments that indicate a regulatory insight
 *   page rather than a generic marketing or contact page. Used during
 *   post-fetch validation to sanity-check that a fetched URL is meaningful.
 *
 * To add a source: add an entry here. No other config change required.
 */

export type SourceCategory =
  | 'big4'
  | 'law_firm'
  | 'regulator_followup'
  | 'industry_body'

export interface TrustedSource {
  name: string
  domain: string              // canonical domain without www.
  category: SourceCategory
  /** URL path fragments that suggest regulatory insight content */
  insight_path_hints?: string[]
  /**
   * Priority for query ordering.
   * 1 = run first, 3 = run last (when MAX_QUERIES cap is close)
   */
  priority: 1 | 2 | 3
  /** Regulator-specific alias terms useful in queries (e.g. 'FCA', 'PRA') */
  regulator_aliases?: string[]
}

export const TRUSTED_SOURCES: TrustedSource[] = [
  // ── Big 4 ──────────────────────────────────────────────────────────────────
  {
    name: 'Deloitte',
    domain: 'deloitte.com',
    category: 'big4',
    priority: 1,
    insight_path_hints: ['insights', 'financial-services', 'regulatory', 'fsrr', 'articles'],
  },
  {
    name: 'KPMG',
    domain: 'kpmg.com',
    category: 'big4',
    priority: 1,
    insight_path_hints: ['insights', 'financial-services', 'regulatory', 'articles'],
  },
  {
    name: 'PwC',
    domain: 'pwc.co.uk',
    category: 'big4',
    priority: 1,
    insight_path_hints: ['financial-services', 'regulatory', 'insights', 'publications'],
  },
  {
    name: 'EY',
    domain: 'ey.com',
    category: 'big4',
    priority: 1,
    insight_path_hints: ['en_gb', 'financial-services', 'insights', 'regulatory'],
  },

  // ── Major UK FS regulatory law firms ───────────────────────────────────────
  {
    name: 'Allen & Overy',
    domain: 'allenovery.com',
    category: 'law_firm',
    priority: 2,
    insight_path_hints: ['insights', 'publications', 'knowledge'],
  },
  {
    name: 'Clifford Chance',
    domain: 'cliffordchance.com',
    category: 'law_firm',
    priority: 2,
    insight_path_hints: ['insights', 'briefings', 'publications'],
  },
  {
    name: 'Linklaters',
    domain: 'linklaters.com',
    category: 'law_firm',
    priority: 2,
    insight_path_hints: ['insights', 'publications'],
  },
  {
    name: 'Freshfields',
    domain: 'freshfields.com',
    category: 'law_firm',
    priority: 2,
    insight_path_hints: ['our-thinking', 'insights'],
  },
  {
    name: 'Slaughter and May',
    domain: 'slaughterandmay.com',
    category: 'law_firm',
    priority: 2,
    insight_path_hints: ['publications', 'insights'],
  },
  {
    name: 'Herbert Smith Freehills',
    domain: 'herbertsmithfreehills.com',
    category: 'law_firm',
    priority: 2,
    insight_path_hints: ['insights', 'publications'],
  },
  {
    name: 'Hogan Lovells',
    domain: 'hoganlovells.com',
    category: 'law_firm',
    priority: 2,
    insight_path_hints: ['knowledge', 'insights'],
  },
  {
    name: 'Norton Rose Fulbright',
    domain: 'nortonrosefulbright.com',
    category: 'law_firm',
    priority: 2,
    insight_path_hints: ['knowledge', 'insights'],
  },

  // ── Regulator follow-up sources ────────────────────────────────────────────
  // These are approved for regulator follow-up content only:
  // speeches, press releases, FAQs, blog posts from the regulator itself.
  {
    name: 'FCA',
    domain: 'fca.org.uk',
    category: 'regulator_followup',
    priority: 1,
    insight_path_hints: ['news', 'publications', 'speeches', 'press-releases', 'blog'],
  },
  {
    name: 'Bank of England / PRA',
    domain: 'bankofengland.co.uk',
    category: 'regulator_followup',
    priority: 1,
    insight_path_hints: ['news', 'speeches', 'publications', 'blog'],
  },

  // ── Industry bodies ────────────────────────────────────────────────────────
  {
    name: 'UK Finance',
    domain: 'ukfinance.org.uk',
    category: 'industry_body',
    priority: 3,
    insight_path_hints: ['news', 'insights', 'publications'],
  },
  {
    name: 'TheCityUK',
    domain: 'thecityuk.com',
    category: 'industry_body',
    priority: 3,
    insight_path_hints: ['research', 'insights', 'news'],
  },
  {
    name: 'Building Societies Association',
    domain: 'bsa.org.uk',
    category: 'industry_body',
    priority: 3,
    insight_path_hints: ['news', 'publications'],
  },
  {
    name: 'Association of British Insurers',
    domain: 'abi.org.uk',
    category: 'industry_body',
    priority: 3,
    insight_path_hints: ['news', 'research', 'publications'],
  },
]

// ── Lookup helpers ─────────────────────────────────────────────────────────

/** Normalise a URL hostname to the canonical domain (strip www.) */
function normaliseHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** True if the URL's domain is in the trusted allowlist. */
export function isDomainTrusted(url: string): boolean {
  const hostname = normaliseHostname(url)
  if (!hostname) return false
  return TRUSTED_SOURCES.some(
    (s) => hostname === s.domain || hostname.endsWith(`.${s.domain}`)
  )
}

/**
 * Return the TrustedSource for a URL, or undefined if not on the allowlist.
 * Handles subdomains (e.g. www2.deloitte.com → deloitte.com entry).
 */
export function getTrustedSourceForUrl(url: string): TrustedSource | undefined {
  const hostname = normaliseHostname(url)
  if (!hostname) return undefined
  return TRUSTED_SOURCES.find(
    (s) => hostname === s.domain || hostname.endsWith(`.${s.domain}`)
  )
}

/** Returns all sources in priority order, Big4 and law firms first. */
export function getSourcesByPriority(): TrustedSource[] {
  return [...TRUSTED_SOURCES].sort((a, b) => a.priority - b.priority)
}

/** Returns sources of a specific category. */
export function getSourcesByCategory(category: SourceCategory): TrustedSource[] {
  return TRUSTED_SOURCES.filter((s) => s.category === category)
}
