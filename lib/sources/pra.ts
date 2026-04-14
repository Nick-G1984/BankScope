import { fetchRSSFeed } from './rss'
import type { RawSourceItem, SourceResult } from '../types'
import type RSSParser from 'rss-parser'

function praCategorise(item: RSSParser.Item): import('../types').ContentType {
  const title = (item.title || '').toLowerCase()
  const cats = ((item.categories || []) as string[]).map((c) => c.toLowerCase()).join(' ')
  const all = title + ' ' + cats

  if (all.includes('consultation') || /\bcp\d/.test(all)) return 'consultation'
  if (all.includes('policy statement') || /\bps\d/.test(all) || all.includes('supervisory statement') || /\bss\d/.test(all)) return 'policy-statement'
  if (all.includes('speech')) return 'speech'
  if (all.includes('enforcement') || all.includes('final notice')) return 'enforcement'
  if (all.includes('publication') || all.includes('report') || all.includes('guidance')) return 'publication'
  return 'news'
}

export async function ingestPRA(): Promise<SourceResult & { items: RawSourceItem[] }> {
  const { items, errors } = await fetchRSSFeed({
    // Primary: GOV.UK atom feed for the Prudential Regulation Authority
    url: 'https://www.gov.uk/government/organisations/prudential-regulation-authority.atom',
    // Fallback: Bank of England site PRA section (may work intermittently)
    fallbackUrls: [
      'https://www.bankofengland.co.uk/prudential-regulation/news-rss',
      'https://www.bankofengland.co.uk/rss/prudential-regulation',
    ],
    source_name: 'PRA',
    source_type: 'regulator',
    default_content_type: 'news',
    categorise: praCategorise,
  })

  return {
    source_name: 'PRA',
    items_fetched: items.length,
    items_new: 0,
    errors,
    items,
  }
}
