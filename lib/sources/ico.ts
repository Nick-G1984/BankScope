import { fetchRSSFeed, generateSourceId } from './rss'
import type { RawSourceItem, SourceResult } from '../types'
import type RSSParser from 'rss-parser'

const UA = 'BankScope-Intelligence/1.0 (regulatory intelligence aggregator; +https://bankscope.io)'
const BASE_ICO = 'https://ico.org.uk'

/**
 * ICO internal search API.
 *
 * Discovered via browser network inspection (April 2026).
 * The ICO website is fully client-side rendered — raw HTML fetches return
 * no article data. The page's search.js calls this endpoint directly.
 *
 * Request:
 *   POST /api/search
 *   Content-Type: application/json
 *   { rootPageId: <int>, filters: [], pageNumber: <int>, order: "newest" }
 *
 * Node IDs (from #filter-page-container[data-node-id] on each listing page):
 *   News & blogs:   https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/  → 2816
 *   Enforcement:    https://ico.org.uk/action-weve-taken/enforcement/               → 17222
 *
 * Response shape:
 *   {
 *     results: Array<{
 *       title: string
 *       url: string          // relative, e.g. "/about-the-ico/media-centre/..."
 *       description: string
 *       createdDateTime: string  // ISO 8601
 *       filterItemMetaData: string  // e.g. "10 April 2026, News"
 *       id: number
 *     }>
 *     pagination: { totalResults, perPage, totalPages, hasMore, ... }
 *   }
 */

const ICO_API_URL = `${BASE_ICO}/api/search`

/** Umbraco CMS node IDs for ICO listing pages */
const NODE_IDS = {
  news: 2816,
  enforcement: 17222,
} as const

function icoMetaToContentType(meta: string): import('../types').ContentType {
  const m = meta.toLowerCase()
  if (m.includes('enforcement') || m.includes('penalty') || m.includes('fine') || m.includes('reprimand')) {
    return 'enforcement'
  }
  if (m.includes('consultation') || m.includes('guidance') || m.includes('code of practice')) {
    return 'consultation'
  }
  if (m.includes('report') || m.includes('publication') || m.includes('research') || m.includes('strategy')) {
    return 'publication'
  }
  if (m.includes('speech') || m.includes('statement')) {
    return 'speech'
  }
  return 'news'
}

function icoCategorise(item: RSSParser.Item): import('../types').ContentType {
  const title = (item.title || '').toLowerCase()
  const cats = ((item.categories || []) as string[]).map((c) => c.toLowerCase()).join(' ')
  const all = title + ' ' + cats
  if (all.includes('fine') || all.includes('enforcement') || all.includes('penalty') || all.includes('reprimand') || all.includes('action')) {
    return 'enforcement'
  }
  if (all.includes('consultation') || all.includes('guidance') || all.includes('code of practice')) return 'consultation'
  if (all.includes('report') || all.includes('publication') || all.includes('research') || all.includes('strategy')) return 'publication'
  return 'news'
}

interface ICOApiItem {
  title: string
  url: string
  description?: string
  createdDateTime?: string
  filterItemMetaData?: string
  id?: number
}

interface ICOApiResponse {
  results: ICOApiItem[]
  pagination: {
    totalResults: number
    perPage: number
    totalPages: number
    hasMore: boolean
  }
}

/**
 * Fetch one page from the ICO internal search API.
 *
 * @param rootPageId  Umbraco node ID for the listing page
 * @param pageNumber  1-based page number
 * @param defaultContentType  Fallback when filterItemMetaData is absent
 */
async function fetchICOApiPage(
  rootPageId: number,
  pageNumber: number,
  defaultContentType: import('../types').ContentType
): Promise<{ items: RawSourceItem[]; pagination: ICOApiResponse['pagination'] | null; error?: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)

  try {
    const res = await fetch(ICO_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': UA,
      },
      body: JSON.stringify({
        rootPageId,
        filters: [],
        pageNumber,
        order: 'newest',
      }),
    })

    if (!res.ok) {
      return {
        items: [],
        pagination: null,
        error: `[ICO API] HTTP ${res.status} for rootPageId=${rootPageId} page=${pageNumber}`,
      }
    }

    const data = (await res.json()) as ICOApiResponse

    const items: RawSourceItem[] = (data.results || []).map((r) => {
      const link = r.url.startsWith('http') ? r.url : `${BASE_ICO}${r.url}`
      const contentType = r.filterItemMetaData
        ? icoMetaToContentType(r.filterItemMetaData)
        : defaultContentType

      let publish_date: string | null = null
      if (r.createdDateTime) {
        const d = new Date(r.createdDateTime)
        if (!isNaN(d.getTime())) publish_date = d.toISOString()
      }

      return {
        source_id: generateSourceId(link, r.title),
        title: r.title,
        source_name: 'ICO',
        source_type: 'regulator' as const,
        content_type: contentType,
        publish_date,
        source_url: link,
        raw_excerpt: r.description?.slice(0, 600) ?? null,
      }
    })

    return { items, pagination: data.pagination }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { items: [], pagination: null, error: `[ICO API] Exception for rootPageId=${rootPageId}: ${msg}` }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fetch the most recent N pages from an ICO listing via the internal API.
 * For ongoing ingestion, fetching only the first page (25 items) is sufficient
 * since the DB upsert deduplicates by source_id. Pass maxPages > 1 for initial seed.
 */
async function ingestICOSection(
  rootPageId: number,
  defaultContentType: import('../types').ContentType,
  label: string,
  maxPages = 1
): Promise<{ items: RawSourceItem[]; errors: string[] }> {
  const allItems: RawSourceItem[] = []
  const errors: string[] = []

  for (let page = 1; page <= maxPages; page++) {
    const { items, pagination, error } = await fetchICOApiPage(rootPageId, page, defaultContentType)
    if (error) {
      errors.push(error)
      break
    }
    allItems.push(...items)
    console.log(
      `[ICO] ${label} page ${page}/${pagination?.totalPages ?? '?'}: ${items.length} items (total=${pagination?.totalResults})`
    )
    if (!pagination?.hasMore) break
  }

  return { items: allItems, errors }
}

export async function ingestICO(): Promise<SourceResult & { items: RawSourceItem[] }> {
  const allItems: RawSourceItem[] = []
  const allErrors: string[] = []
  const seen = new Set<string>()

  // ── Tier 1: Enforcement RSS (confirmed working) ───────────────────────────
  // Keep the RSS as primary for enforcement — it's a proper feed and reliable.
  const enforcementRSS = await fetchRSSFeed({
    url: 'https://ico.org.uk/global/rss-feeds/enforcement/',
    fallbackUrls: [
      'https://cy.ico.org.uk/global/rss-feeds/enforcement/',
    ],
    source_name: 'ICO',
    source_type: 'regulator',
    default_content_type: 'enforcement',
    categorise: icoCategorise,
  })

  if (enforcementRSS.successUrl) {
    console.log(`[ICO] Enforcement RSS: ${enforcementRSS.items.length} items`)
    for (const item of enforcementRSS.items) {
      if (!seen.has(item.source_id)) {
        seen.add(item.source_id)
        allItems.push(item)
      }
    }
  } else {
    // RSS failed — fall back to API for enforcement
    console.warn('[ICO] Enforcement RSS unavailable — falling back to internal API')
    allErrors.push(...enforcementRSS.errors)

    const { items, errors } = await ingestICOSection(NODE_IDS.enforcement, 'enforcement', 'Enforcement API')
    allErrors.push(...errors)
    for (const item of items) {
      if (!seen.has(item.source_id)) {
        seen.add(item.source_id)
        allItems.push(item)
      }
    }
  }

  // ── Tier 2: News & blogs via internal API ─────────────────────────────────
  // ICO removed their news RSS in their website redesign. The internal API
  // (POST /api/search with rootPageId=2816) is the only reliable source.
  const { items: newsItems, errors: newsErrors } = await ingestICOSection(
    NODE_IDS.news,
    'news',
    'News & blogs API'
  )
  allErrors.push(...newsErrors)
  for (const item of newsItems) {
    if (!seen.has(item.source_id)) {
      seen.add(item.source_id)
      allItems.push(item)
    }
  }

  return {
    source_name: 'ICO',
    items_fetched: allItems.length,
    items_new: 0,
    errors: allErrors,
    items: allItems,
  }
}
