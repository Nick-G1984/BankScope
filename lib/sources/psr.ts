/**
 * Payment Systems Regulator (PSR) source connector.
 *
 * PSR publishes consultations, policy statements, market reviews, and
 * general news at psr.org.uk. PSR is a subsidiary of the FCA and regulates
 * payment systems including Faster Payments, CHAPS, and card networks.
 *
 * Feed strategy:
 *   Primary:  GOV.UK atom feed for PSR (highly reliable)
 *   Fallback: PSR own RSS feed
 *
 * Source category: core_fs
 * Regulated domains: payments
 */

import { fetchRSSFeed } from './rss'
import type { RawSourceItem, SourceResult } from '../types'
import type RSSParser from 'rss-parser'

function psrCategorise(item: RSSParser.Item): import('../types').ContentType {
  const title = (item.title || '').toLowerCase()
  const cats = ((item.categories || []) as string[]).join(' ').toLowerCase()
  const all = title + ' ' + cats

  if (
    all.includes('consultation') ||
    all.includes('call for views') ||
    /\bcp\d/.test(all) ||
    /\bdp\d/.test(all)
  ) return 'consultation'
  if (all.includes('policy statement') || /\bps\d/.test(all)) return 'policy-statement'
  if (all.includes('market review') || all.includes('interim report') || all.includes('report')) return 'publication'
  if (all.includes('speech')) return 'speech'
  if (all.includes('direction') || all.includes('specific direction')) return 'enforcement'
  if (all.includes('press release') || all.includes('statement')) return 'press-release'
  return 'news'
}

export async function ingestPSR(): Promise<SourceResult & { items: RawSourceItem[] }> {
  const { items, errors } = await fetchRSSFeed({
    url: 'https://www.gov.uk/government/organisations/payment-systems-regulator.atom',
    fallbackUrls: [
      'https://www.psr.org.uk/news/rss.xml',
      'https://www.psr.org.uk/media/rss.xml',
    ],
    source_name: 'PSR',
    source_type: 'regulator',
    default_content_type: 'news',
    categorise: psrCategorise,
  })

  return {
    source_name: 'PSR',
    items_fetched: items.length,
    items_new: 0,
    errors,
    items,
  }
}
