/**
 * Ofcom source connector.
 *
 * Ofcom regulates UK communications services including broadband, mobile,
 * TV, and radio. Relevant to FS firms for: operational resilience dependencies
 * on telecoms infrastructure, consumer protection (BNPL/telecoms crossover),
 * and digital identity infrastructure.
 *
 * Feed strategy:
 *   Primary:  Ofcom news RSS
 *   Fallback: Ofcom consultations RSS or GOV.UK atom
 *
 * Source category: sector_specific
 * Regulated domains: telecoms
 */

import { fetchRSSFeed } from './rss'
import type { RawSourceItem, SourceResult } from '../types'
import type RSSParser from 'rss-parser'

function ofcomCategorise(item: RSSParser.Item): import('../types').ContentType {
  const title = (item.title || '').toLowerCase()
  const cats = ((item.categories || []) as string[]).join(' ').toLowerCase()
  const all = title + ' ' + cats

  if (all.includes('consultation') || all.includes('call for inputs') || all.includes('call for evidence')) return 'consultation'
  if (
    all.includes('statement') ||
    all.includes('policy statement') ||
    all.includes('decision')
  ) return 'policy-statement'
  if (
    all.includes('enforcement') ||
    all.includes('fine') ||
    all.includes('penalty') ||
    all.includes('investigation')
  ) return 'enforcement'
  if (
    all.includes('report') ||
    all.includes('research') ||
    all.includes('review') ||
    all.includes('annual')
  ) return 'publication'
  if (all.includes('speech') || all.includes('keynote')) return 'speech'
  if (all.includes('press release') || all.includes('media release')) return 'press-release'
  return 'news'
}

export async function ingestOfcom(): Promise<SourceResult & { items: RawSourceItem[] }> {
  const { items, errors } = await fetchRSSFeed({
    url: 'https://www.ofcom.org.uk/about-ofcom/latest/media/rss/all-news.rss',
    fallbackUrls: [
      'https://www.ofcom.org.uk/news-centre/rss',
      'https://www.ofcom.org.uk/news-centre/rss.xml',
      'https://www.gov.uk/government/organisations/ofcom.atom',
    ],
    source_name: 'Ofcom',
    source_type: 'regulator',
    default_content_type: 'news',
    categorise: ofcomCategorise,
  })

  return {
    source_name: 'Ofcom',
    items_fetched: items.length,
    items_new: 0,
    errors,
    items,
  }
}
