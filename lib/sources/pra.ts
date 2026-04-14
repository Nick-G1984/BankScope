import { fetchRSSFeed } from './rss'
import type { RawSourceItem, SourceResult } from '../types'
import type RSSParser from 'rss-parser'

function praCategorise(item: RSSParser.Item): import('../types').ContentType {
  const title = (item.title || '').toLowerCase()
  if (title.includes('consultation') || title.includes('cp')) return 'consultation'
  if (title.includes('policy statement') || title.includes('ps')) return 'policy-statement'
  if (title.includes('speech')) return 'speech'
  if (title.includes('enforcement') || title.includes('final notice')) return 'enforcement'
  if (title.includes('publication') || title.includes('supervisory statement')) return 'publication'
  return 'news'
}

export async function ingestPRA(): Promise<SourceResult & { items: RawSourceItem[] }> {
  const { items, errors } = await fetchRSSFeed({
    url: 'https://www.bankofengland.co.uk/prudential-regulation/news-rss',
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
