import { fetchRSSFeed } from './rss'
import type { RawSourceItem, SourceResult } from '../types'
import type RSSParser from 'rss-parser'

function icoCategorise(item: RSSParser.Item): import('../types').ContentType {
  const title = (item.title || '').toLowerCase()
  if (title.includes('fine') || title.includes('enforcement') || title.includes('penalty') || title.includes('reprimand')) {
    return 'enforcement'
  }
  if (title.includes('consultation') || title.includes('guidance')) return 'consultation'
  if (title.includes('report') || title.includes('publication')) return 'publication'
  return 'news'
}

export async function ingestICO(): Promise<SourceResult & { items: RawSourceItem[] }> {
  const { items, errors } = await fetchRSSFeed({
    url: 'https://ico.org.uk/feed/',
    source_name: 'ICO',
    source_type: 'regulator',
    default_content_type: 'news',
    categorise: icoCategorise,
  })

  return {
    source_name: 'ICO',
    items_fetched: items.length,
    items_new: 0,
    errors,
    items,
  }
}
