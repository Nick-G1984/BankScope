/**
 * Financial Ombudsman Service (FOS) source connector.
 *
 * FOS publishes news, press releases, ombudsman news, and technical
 * decisions on financial-ombudsman.org.uk.
 *
 * Feed strategy:
 *   Primary:  FOS news RSS at financial-ombudsman.org.uk/news/rss.xml
 *   Fallback: FOS media/news atom feed (alternate path)
 *
 * Source category: adjacent
 * Regulated domains: redress, consumer_credit, general_fs
 */

import { fetchRSSFeed } from './rss'
import type { RawSourceItem, SourceResult } from '../types'
import type RSSParser from 'rss-parser'

function fosCategorise(item: RSSParser.Item): import('../types').ContentType {
  const title = (item.title || '').toLowerCase()
  const cats = ((item.categories || []) as string[]).join(' ').toLowerCase()
  const all = title + ' ' + cats

  if (all.includes('press release') || all.includes('statement')) return 'press-release'
  if (
    all.includes('consultation') ||
    all.includes('discussion paper') ||
    all.includes('call for input')
  ) return 'consultation'
  if (all.includes('report') || all.includes('data') || all.includes('annual review')) return 'publication'
  if (all.includes('speech') || all.includes('keynote')) return 'speech'
  return 'news'
}

export async function ingestFOS(): Promise<SourceResult & { items: RawSourceItem[] }> {
  const { items, errors } = await fetchRSSFeed({
    url: 'https://www.financial-ombudsman.org.uk/news/rss.xml',
    fallbackUrls: [
      'https://www.financial-ombudsman.org.uk/news/rss',
      'https://www.financial-ombudsman.org.uk/media/rss.xml',
    ],
    source_name: 'FOS',
    source_type: 'regulator',
    default_content_type: 'news',
    categorise: fosCategorise,
  })

  return {
    source_name: 'FOS',
    items_fetched: items.length,
    items_new: 0,
    errors,
    items,
  }
}
