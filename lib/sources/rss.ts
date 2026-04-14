import RSSParser from 'rss-parser'
import { createHash } from 'crypto'
import type { RawSourceItem, SourceType, ContentType } from '../types'

// Parser with reasonable timeout — individual feeds get per-fetch AbortController too
const parser = new RSSParser({
  timeout: 12000,
  headers: {
    'User-Agent': 'BankScope-Intelligence/1.0 (regulatory intelligence aggregator; +https://bankscope.io)',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  },
})

export interface RSSFeedConfig {
  /** Primary URL — tried first */
  url: string
  /** Optional fallback URLs tried in order if primary fails */
  fallbackUrls?: string[]
  source_name: string
  source_type: SourceType
  default_content_type: ContentType
  /** Optional: override content type based on item categories / title */
  categorise?: (item: RSSParser.Item) => ContentType
}

export function generateSourceId(url: string, title: string): string {
  return createHash('sha256')
    .update(`${url}::${title}`)
    .digest('hex')
    .slice(0, 32)
}

export function extractExcerpt(item: RSSParser.Item, maxLength = 600): string {
  const content =
    item.contentSnippet ||
    item.content ||
    item.summary ||
    item.title ||
    ''

  // Strip HTML tags if any remain
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text
}

export function parseDate(item: RSSParser.Item): string | null {
  const raw = item.pubDate || item.isoDate
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

/**
 * Try to parse a single URL with a per-request timeout via AbortController.
 * Returns the feed on success or throws on failure.
 */
async function tryParseURL(url: string, timeoutMs = 15000): Promise<RSSParser.Output<Record<string, unknown>>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    // rss-parser doesn't natively support AbortSignal, so we wrap in a race
    const feed = await Promise.race([
      parser.parseURL(url),
      new Promise<never>((_, reject) =>
        controller.signal.addEventListener('abort', () =>
          reject(new Error(`Timed out after ${timeoutMs}ms fetching ${url}`))
        )
      ),
    ])
    return feed
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fetch a single RSS/Atom feed, trying the primary URL then each fallback in order.
 * Returns items from the first URL that succeeds. Errors from all tried URLs are collected.
 */
export async function fetchRSSFeed(config: RSSFeedConfig): Promise<{
  items: RawSourceItem[]
  errors: string[]
  successUrl: string | null
}> {
  const urlsToTry = [config.url, ...(config.fallbackUrls ?? [])]
  const errors: string[] = []

  for (const url of urlsToTry) {
    try {
      const feed = await tryParseURL(url)
      const items: RawSourceItem[] = []

      for (const item of feed.items) {
        if (!item.title) continue

        const link = item.link || item.guid || url
        const sourceId = generateSourceId(link, item.title)
        const content_type = config.categorise ? config.categorise(item) : config.default_content_type

        items.push({
          source_id: sourceId,
          title: item.title.trim(),
          source_name: config.source_name,
          source_type: config.source_type,
          content_type,
          publish_date: parseDate(item),
          source_url: typeof link === 'string' ? link : null,
          raw_excerpt: extractExcerpt(item),
        })
      }

      return { items, errors, successUrl: url }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`[${config.source_name}] Failed ${url}: ${msg}`)
      // Continue to next fallback
    }
  }

  return { items: [], errors, successUrl: null }
}

/**
 * Fetch multiple RSS feeds concurrently. Deduplicates items by source_id across feeds.
 */
export async function fetchMultipleRSSFeeds(configs: RSSFeedConfig[]): Promise<{
  items: RawSourceItem[]
  errors: string[]
}> {
  const results = await Promise.allSettled(configs.map(fetchRSSFeed))

  const allItems: RawSourceItem[] = []
  const allErrors: string[] = []
  const seenIds = new Set<string>()

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const item of result.value.items) {
        if (!seenIds.has(item.source_id)) {
          seenIds.add(item.source_id)
          allItems.push(item)
        }
      }
      allErrors.push(...result.value.errors)
    } else {
      allErrors.push(`Unexpected error: ${result.reason}`)
    }
  }

  return { items: allItems, errors: allErrors }
}
