/**
 * Advertising Standards Authority (ASA) source connector.
 *
 * ASA regulates advertising across all media. Relevant to FS firms
 * for financial promotions guidance, enforcement rulings on misleading
 * financial advertising, and interaction with FCA financial promotion rules.
 *
 * ASA publishes rulings, news, and guidance at asa.org.uk.
 *
 * Feed strategy:
 *   Primary:  ASA news RSS
 *   Fallback: ASA rulings RSS (high volume — enforcement focus)
 *
 * Note: Rulings RSS can be very high volume. We cap at 50 recent items
 * by deduplication and the default fetchRSSFeed behaviour.
 *
 * Source category: sector_specific
 * Regulated domains: advertising
 */

import { fetchMultipleRSSFeeds } from './rss'
import type { RawSourceItem, SourceResult } from '../types'
import type RSSParser from 'rss-parser'

function asaCategorise(item: RSSParser.Item): import('../types').ContentType {
  const title = (item.title || '').toLowerCase()
  const cats = ((item.categories || []) as string[]).join(' ').toLowerCase()
  const link = (item.link || '').toLowerCase()
  const all = title + ' ' + cats + ' ' + link

  // Rulings URL pattern: asa.org.uk/rulings/
  if (all.includes('/rulings/') || all.includes('ruling') || all.includes('adjudication')) return 'enforcement'
  if (all.includes('consultation') || all.includes('call for evidence')) return 'consultation'
  if (
    all.includes('guidance') ||
    all.includes('advice') ||
    all.includes('cap code') ||
    all.includes('bcap code')
  ) return 'publication'
  if (all.includes('speech')) return 'speech'
  if (all.includes('press release') || all.includes('media release')) return 'press-release'
  return 'news'
}

export async function ingestASA(): Promise<SourceResult & { items: RawSourceItem[] }> {
  const { items, errors } = await fetchMultipleRSSFeeds([
    {
      url: 'https://www.asa.org.uk/news/rss.xml',
      fallbackUrls: ['https://www.asa.org.uk/news/news.rss'],
      source_name: 'ASA',
      source_type: 'regulator',
      default_content_type: 'news',
      categorise: asaCategorise,
    },
    // Financial services-relevant rulings are a subset — we ingest all rulings
    // and AI scoring/categorisation will filter relevance downstream
    {
      url: 'https://www.asa.org.uk/rulings/rss.xml',
      fallbackUrls: ['https://www.asa.org.uk/rulings.rss'],
      source_name: 'ASA',
      source_type: 'regulator',
      default_content_type: 'enforcement',
      categorise: asaCategorise,
    },
  ])

  return {
    source_name: 'ASA',
    items_fetched: items.length,
    items_new: 0,
    errors,
    items,
  }
}
