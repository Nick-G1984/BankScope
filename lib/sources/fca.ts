import { fetchMultipleRSSFeeds } from './rss'
import type { RawSourceItem, SourceResult } from '../types'
import type RSSParser from 'rss-parser'

function fcaCategorise(item: RSSParser.Item): import('../types').ContentType {
  const title = (item.title || '').toLowerCase()
  const cats = ((item.categories || []) as string[]).map((c) => c.toLowerCase())
  const all = [title, ...cats].join(' ')

  if (all.includes('enforcement') || all.includes('final notice') || all.includes('warning notice')) return 'enforcement'
  if (all.includes('consultation') || /\bcp\d/.test(all) || /\bdp\d/.test(all)) return 'consultation'
  if (all.includes('speech')) return 'speech'
  if (all.includes('policy statement') || /\bps\d/.test(all)) return 'policy-statement'
  if (all.includes('press release') || all.includes('statement')) return 'press-release'
  if (all.includes('publication') || all.includes('report') || all.includes('guidance') || all.includes('data')) return 'publication'
  return 'news'
}

export async function ingestFCA(): Promise<SourceResult & { items: RawSourceItem[] }> {
  const configs = [
    {
      // Primary: official GOV.UK atom feed for FCA — most reliable
      url: 'https://www.gov.uk/government/organisations/financial-conduct-authority.atom',
      // Fallback: fca.org.uk general news RSS (may work when atom doesn't)
      fallbackUrls: ['https://www.fca.org.uk/news/rss.xml'],
      source_name: 'FCA',
      source_type: 'regulator' as const,
      default_content_type: 'news' as const,
      categorise: fcaCategorise,
    },
    {
      // Publications feed — use GOV.UK as primary, fca.org.uk as fallback
      url: 'https://www.fca.org.uk/publications/rss.xml',
      fallbackUrls: [],
      source_name: 'FCA',
      source_type: 'regulator' as const,
      default_content_type: 'publication' as const,
      categorise: fcaCategorise,
    },
  ]

  const { items, errors } = await fetchMultipleRSSFeeds(configs)
  // fetchMultipleRSSFeeds already deduplicates by source_id

  return {
    source_name: 'FCA',
    items_fetched: items.length,
    items_new: 0, // set by the ingestion orchestrator after DB check
    errors,
    items,
  }
}
