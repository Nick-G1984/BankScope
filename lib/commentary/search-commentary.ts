/**
 * Web search wrapper for commentary enrichment.
 *
 * Supports two search backends:
 *   1. Tavily (preferred) — designed for AI/research use cases.
 *      Returns structured results with content excerpts.
 *      Set TAVILY_API_KEY in environment.
 *
 *   2. Bing Web Search API (fallback) — standard web search.
 *      Set BING_SEARCH_API_KEY in environment.
 *
 * If neither is configured, the function throws a clear error explaining
 * what to set up. Commentary enrichment will not run silently without a
 * configured search backend.
 *
 * Result count: capped at 5 per query. We run many targeted queries and
 * want depth-per-query to be low to avoid processing noise.
 */

export interface SearchResult {
  url: string
  title: string
  /** Text snippet / excerpt from the search engine result */
  snippet: string
  /** Hostname without www. */
  domain: string
  /** Full page content if the search backend returned it (Tavily) */
  raw_content?: string
}

// ── Tavily ─────────────────────────────────────────────────────────────────

interface TavilyResult {
  url: string
  title: string
  content: string
  raw_content?: string
  score?: number
}

interface TavilyResponse {
  results?: TavilyResult[]
  error?: string
}

async function searchViaTavily(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) throw new Error('TAVILY_API_KEY not set')

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',   // 'advanced' costs 2 credits — not needed here
      max_results: 5,
      include_raw_content: false, // We fetch content ourselves for accepted results
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Tavily search failed (${response.status}): ${text.slice(0, 200)}`)
  }

  const data = (await response.json()) as TavilyResponse
  if (data.error) throw new Error(`Tavily error: ${data.error}`)

  return (data.results ?? []).map((r) => ({
    url: r.url,
    title: r.title,
    snippet: r.content ?? '',
    domain: normaliseDomain(r.url),
    raw_content: r.raw_content,
  }))
}

// ── Bing Web Search API ────────────────────────────────────────────────────

interface BingWebPage {
  url: string
  name: string
  snippet: string
  dateLastCrawled?: string
}

interface BingResponse {
  webPages?: { value: BingWebPage[] }
  error?: { code: string; message: string }
}

async function searchViaBing(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.BING_SEARCH_API_KEY
  if (!apiKey) throw new Error('BING_SEARCH_API_KEY not set')

  const url =
    `https://api.bing.microsoft.com/v7.0/search` +
    `?q=${encodeURIComponent(query)}&count=5&mkt=en-GB&safeSearch=Moderate`

  const response = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Bing search failed (${response.status}): ${text.slice(0, 200)}`)
  }

  const data = (await response.json()) as BingResponse
  if (data.error) throw new Error(`Bing error: ${data.error.code} — ${data.error.message}`)

  return (data.webPages?.value ?? []).map((r) => ({
    url: r.url,
    title: r.name,
    snippet: r.snippet ?? '',
    domain: normaliseDomain(r.url),
  }))
}

// ── Public interface ───────────────────────────────────────────────────────

/**
 * Returns the configured search backend name, or null if not configured.
 * Use to check before attempting enrichment.
 */
export function getSearchBackend(): 'tavily' | 'bing' | null {
  if (process.env.TAVILY_API_KEY) return 'tavily'
  if (process.env.BING_SEARCH_API_KEY) return 'bing'
  return null
}

/**
 * Run a search query using the configured backend.
 * Prefers Tavily, falls back to Bing.
 * Throws if neither is configured.
 */
export async function executeSearch(query: string): Promise<SearchResult[]> {
  const backend = getSearchBackend()
  if (!backend) {
    throw new Error(
      'Commentary search requires a search API. ' +
        'Set TAVILY_API_KEY (preferred) or BING_SEARCH_API_KEY in your environment.'
    )
  }
  if (backend === 'tavily') return searchViaTavily(query)
  return searchViaBing(query)
}

// ── Helpers ────────────────────────────────────────────────────────────────

function normaliseDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}
