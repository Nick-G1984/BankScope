import { fetchRSSFeed } from './rss'
import type { RawSourceItem, SourceResult } from '../types'
import type RSSParser from 'rss-parser'

function hmtCategorise(item: RSSParser.Item): import('../types').ContentType {
  const title = (item.title || '').toLowerCase()
  const cats = ((item.categories || []) as string[]).map((c) => c.toLowerCase()).join(' ')
  const all = title + ' ' + cats

  if (all.includes('consultation')) return 'consultation'
  if (all.includes('policy') || all.includes('budget') || all.includes('autumn statement') || all.includes('spring statement')) return 'policy-statement'
  if (all.includes('speech')) return 'speech'
  if (all.includes('press release')) return 'press-release'
  if (all.includes('guidance') || all.includes('publication')) return 'publication'
  return 'news'
}

export async function ingestHMT(): Promise<SourceResult & { items: RawSourceItem[] }> {
  const { items, errors } = await fetchRSSFeed({
    url: 'https://www.gov.uk/government/organisations/hm-treasury.atom',
    source_name: 'HM Treasury',
    source_type: 'government',
    default_content_type: 'news',
    categorise: hmtCategorise,
  })

  // Filter to items likely relevant to financial services
  const relevant = items.filter((item) => {
    const text = (item.title + ' ' + (item.raw_excerpt || '')).toLowerCase()
    const keywords = [
      'bank', 'building society', 'savings', 'mortgage', 'credit', 'lending',
      'consumer credit', 'financial services', 'payment', 'fraud', 'fintech',
      'regulatory', 'regulation', 'fsma', 'fca', 'pra', 'insurance', 'pension',
      'interest rate', 'inflation', 'dormant', 'deposit', 'investment',
    ]
    return keywords.some((kw) => text.includes(kw))
  })

  return {
    source_name: 'HM Treasury',
    items_fetched: relevant.length,
    items_new: 0,
    errors,
    items: relevant,
  }
}
