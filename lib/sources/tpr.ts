/**
 * The Pensions Regulator (TPR) source connector.
 *
 * TPR regulates workplace pension schemes and publishes guidance, codes
 * of practice, enforcement actions, and news at thepensionsregulator.gov.uk.
 *
 * Feed strategy:
 *   Primary:  GOV.UK atom feed (highly reliable infrastructure)
 *   Fallback: TPR own news RSS
 *
 * Source category: sector_specific
 * Regulated domains: pensions
 */

import { fetchRSSFeed } from './rss'
import type { RawSourceItem, SourceResult } from '../types'
import type RSSParser from 'rss-parser'

function tprCategorise(item: RSSParser.Item): import('../types').ContentType {
  const title = (item.title || '').toLowerCase()
  const cats = ((item.categories || []) as string[]).join(' ').toLowerCase()
  const all = title + ' ' + cats

  if (all.includes('consultation') || all.includes('call for evidence')) return 'consultation'
  if (
    all.includes('code of practice') ||
    all.includes('regulatory code') ||
    all.includes('guidance') ||
    all.includes('policy')
  ) return 'policy-statement'
  if (
    all.includes('enforcement') ||
    all.includes('penalty') ||
    all.includes('anti-avoidance') ||
    all.includes('regulatory action')
  ) return 'enforcement'
  if (
    all.includes('research') ||
    all.includes('report') ||
    all.includes('annual report') ||
    all.includes('survey')
  ) return 'publication'
  if (all.includes('speech') || all.includes('keynote')) return 'speech'
  if (all.includes('press release') || all.includes('media release')) return 'press-release'
  return 'news'
}

export async function ingestTPR(): Promise<SourceResult & { items: RawSourceItem[] }> {
  const { items, errors } = await fetchRSSFeed({
    url: 'https://www.gov.uk/government/organisations/the-pensions-regulator.atom',
    fallbackUrls: [
      'https://www.thepensionsregulator.gov.uk/en/media-hub/press-releases/rss',
      'https://www.thepensionsregulator.gov.uk/rss',
    ],
    source_name: 'TPR',
    source_type: 'regulator',
    default_content_type: 'news',
    categorise: tprCategorise,
  })

  return {
    source_name: 'TPR',
    items_fetched: items.length,
    items_new: 0,
    errors,
    items,
  }
}
