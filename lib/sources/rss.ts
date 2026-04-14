import RSSParser from 'rss-parser'
import { createHash } from 'crypto'
import type { RawSourceItem, SourceType, ContentType } from '../types'

const parser = new RSSParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'BankScope-Intelligence/1.0 (regulatory intelligence aggregator)',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
  },
})

export interface RSSFeedConfig {
  url: string
  source_name: string
  source_type: SourceType
  default_content_type: ContentType
  /** Optional: override content type based on item categories */
  categorise?: (item: RSSParser.Item) => ContentType
}

function generateSourceId(url: string, title: string): string {
  return createHash('sha256')
    .update(`${url}::${title}`)
    .digest('hex')
    .slice(0, 32)
}

function extractExcerpt(item: RSSParser.Item, maxLength = 500): string {
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

function parseDate(item: RSSParser.Item): string | null {
  const raw = item.pubDate || item.isoDate
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

export async function fetchRSSFeed(config: RSSFeedConfig): Promise<{
  items: RawSourceItem[]
  errors: string[]
}> {
  const errors: string[] = []

  try {
    const feed = await parser.parseURL(config.url)
    const items: RawSourceItem[] = []

    for (const item of feed.items) {
      if (!item.title) continue

      const link = item.link || item.guid || config.url
      const sourceId = generateSourceId(link, item.title)
      const content_type = config.categorise ? config.categorise(item) : config.default_content_type

      items.push({
        source_id: sourceId,
        title: item.title.trim(),
        source_name: config.source_name,
        source_type: config.source_type,
        content_type,
        publish_date: parseDate(item),
        source_url: link || null,
        raw_excerpt: extractExcerpt(item),
      })
    }

    return { items, errors }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`Failed to fetch ${config.url}: ${msg}`)
    return { items: [], errors }
  }
}

export async function fetchMultipleRSSFeeds(configs: RSSFeedConfig[]): Promise<{
  items: RawSourceItem[]
  errors: string[]
}> {
  const results = await Promise.allSettled(configs.map(fetchRSSFeed))

  const allItems: RawSourceItem[] = []
  const allErrors: string[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value.items)
      allErrors.push(...result.value.errors)
    } else {
      allErrors.push(`Unexpected error: ${result.reason}`)
    }
  }

  return { items: allItems, errors: allErrors }
}
