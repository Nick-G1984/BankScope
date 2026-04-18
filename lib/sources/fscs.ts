/**
 * Financial Services Compensation Scheme (FSCS) source connector.
 *
 * FSCS publishes news about firm failures, compensation announcements,
 * declarations, and policy/governance updates at fscs.org.uk.
 *
 * Feed strategy:
 *   Primary:  FSCS news RSS
 *   Fallback: FSCS press releases RSS
 *
 * Source category: adjacent
 * Regulated domains: compensation, banking, investments
 */

import { fetchRSSFeed } from './rss'
import type { RawSourceItem, SourceResult } from '../types'
import type RSSParser from 'rss-parser'

function fscsCategorise(item: RSSParser.Item): import('../types').ContentType {
  const title = (item.title || '').toLowerCase()
  const cats = ((item.categories || []) as string[]).join(' ').toLowerCase()
  const all = title + ' ' + cats

  if (
    all.includes('in default') ||
    all.includes('failure') ||
    all.includes('declaration') ||
    all.includes('compensation')
  ) return 'enforcement'
  if (all.includes('press release') || all.includes('statement')) return 'press-release'
  if (all.includes('consultation') || all.includes('policy')) return 'consultation'
  if (all.includes('report') || all.includes('annual')) return 'publication'
  return 'news'
}

export async function ingestFSCS(): Promise<SourceResult & { items: RawSourceItem[] }> {
  const { items, errors } = await fetchRSSFeed({
    url: 'https://www.fscs.org.uk/news/latest-news.rss',
    fallbackUrls: [
      'https://www.fscs.org.uk/news/rss.xml',
      'https://www.fscs.org.uk/rss/news',
    ],
    source_name: 'FSCS',
    source_type: 'regulator',
    default_content_type: 'news',
    categorise: fscsCategorise,
  })

  return {
    source_name: 'FSCS',
    items_fetched: items.length,
    items_new: 0,
    errors,
    items,
  }
}
