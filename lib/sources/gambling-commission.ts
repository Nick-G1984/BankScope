/**
 * Gambling Commission source connector.
 *
 * The Gambling Commission regulates gambling in Great Britain. Relevant
 * to FS firms via: AML/KYC crossover in payment processing, affordability
 * checks (overlapping with consumer credit), and FS firms that provide
 * banking/payment services to gambling operators.
 *
 * Feed strategy:
 *   Primary:  GOV.UK atom feed (highly reliable)
 *   Fallback: Gambling Commission own RSS/news feed
 *
 * Source category: sector_specific
 * Regulated domains: gambling
 */

import { fetchRSSFeed } from './rss'
import type { RawSourceItem, SourceResult } from '../types'
import type RSSParser from 'rss-parser'

function gamblingCategorise(item: RSSParser.Item): import('../types').ContentType {
  const title = (item.title || '').toLowerCase()
  const cats = ((item.categories || []) as string[]).join(' ').toLowerCase()
  const all = title + ' ' + cats

  if (all.includes('consultation') || all.includes('call for evidence')) return 'consultation'
  if (
    all.includes('licence condition') ||
    all.includes('social responsibility code') ||
    all.includes('technical standard') ||
    all.includes('code of practice')
  ) return 'policy-statement'
  if (
    all.includes('enforcement') ||
    all.includes('penalty package') ||
    all.includes('licence revoked') ||
    all.includes('formal warning') ||
    all.includes('regulatory settlement')
  ) return 'enforcement'
  if (
    all.includes('statistics') ||
    all.includes('industry statistics') ||
    all.includes('research') ||
    all.includes('report') ||
    all.includes('review')
  ) return 'publication'
  if (all.includes('speech') || all.includes('keynote')) return 'speech'
  if (all.includes('news') || all.includes('update')) return 'news'
  return 'news'
}

export async function ingestGamblingCommission(): Promise<SourceResult & { items: RawSourceItem[] }> {
  const { items, errors } = await fetchRSSFeed({
    url: 'https://www.gov.uk/government/organisations/gambling-commission.atom',
    fallbackUrls: [
      'https://www.gamblingcommission.gov.uk/news/rss.xml',
      'https://www.gamblingcommission.gov.uk/news-action-and-statistics/news/rss',
    ],
    source_name: 'Gambling Commission',
    source_type: 'regulator',
    default_content_type: 'news',
    categorise: gamblingCategorise,
  })

  return {
    source_name: 'Gambling Commission',
    items_fetched: items.length,
    items_new: 0,
    errors,
    items,
  }
}
