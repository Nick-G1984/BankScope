import { fetchRSSFeed } from './rss'
import type { RawSourceItem, SourceResult } from '../types'
import type RSSParser from 'rss-parser'

function boeCategorise(item: RSSParser.Item): import('../types').ContentType {
  const title = (item.title || '').toLowerCase()
  const cats = ((item.categories || []) as string[]).map((c) => c.toLowerCase()).join(' ')
  const all = title + ' ' + cats

  if (all.includes('financial stability report')) return 'publication'
  if (all.includes('monetary policy')) return 'policy-statement'
  if (all.includes('speech')) return 'speech'
  if (all.includes('working paper') || all.includes('research')) return 'publication'
  if (all.includes('consultation')) return 'consultation'
  if (all.includes('quarterly bulletin')) return 'publication'
  return 'news'
}

export async function ingestBoE(): Promise<SourceResult & { items: RawSourceItem[] }> {
  const { items, errors } = await fetchRSSFeed({
    url: 'https://www.bankofengland.co.uk/rss/publications',
    source_name: 'Bank of England',
    source_type: 'regulator',
    default_content_type: 'publication',
    categorise: boeCategorise,
  })

  return {
    source_name: 'Bank of England',
    items_fetched: items.length,
    items_new: 0,
    errors,
    items,
  }
}
