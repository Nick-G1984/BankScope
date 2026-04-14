import { fetchMultipleRSSFeeds } from './rss'
import type { RawSourceItem, SourceResult, ContentType } from '../types'
import type RSSParser from 'rss-parser'

function fcaCategorise(item: RSSParser.Item): ContentType {
  const title = (item.title || '').toLowerCase()
  const cats = ((item.categories || []) as string[]).map((c) => c.toLowerCase())
  const all = [title, ...cats].join(' ')

  if (all.includes('enforcement') || all.includes('final notice')) return 'enforcement'
  if (all.includes('consultation') || all.includes('cp20') || all.includes('dp20')) return 'consultation'
  if (all.includes('speech')) return 'speech'
  if (all.includes('press release')) return 'press-release'
  if (all.includes('policy statement') || all.includes('ps20')) return 'policy-statement'
  if (all.includes('publication') || all.includes('report') || all.includes('guidance')) return 'publication'
  return 'news'
}

export async function ingestFCA(): Promise<SourceResult & { items: RawSourceItem[] }> {
  const configs = [
    {
      url: 'https://www.fca.org.uk/news/rss.xml',
      source_name: 'FCA',
      source_type: 'regulator' as const,
      default_content_type: 'news' as const,
      categorise: fcaCategorise,
    },
    {
      url: 'https://www.fca.org.uk/news/press-releases/rss.xml',
      source_name: 'FCA',
      source_type: 'regulator' as const,
      default_content_type: 'press-release' as const,
      categorise: fcaCategorise,
    },
    {
      url: 'https://www.fca.org.uk/publications/rss.xml',
      source_name: 'FCA',
      source_type: 'regulator' as const,
      default_content_type: 'publication' as const,
      categorise: fcaCategorise,
    },
    {
      url: 'https://www.fca.org.uk/news/speeches/rss.xml',
      source_name: 'FCA',
      source_type: 'regulator' as const,
      default_content_type: 'speech' as const,
    },
  ]

  const { items, errors } = await fetchMultipleRSSFeeds(configs)

  // Deduplicate by source_id within this batch
  const seen = new Set<string>()
  const deduplicated = items.filter((item) => {
    if (seen.has(item.source_id)) return false
    seen.add(item.source_id)
    return true
  })

  return {
    source_name: 'FCA',
    items_fetched: deduplicated.length,
    items_new: 0, // set by the ingestion orchestrator after DB check
    errors,
    items: deduplicated,
  }
}
