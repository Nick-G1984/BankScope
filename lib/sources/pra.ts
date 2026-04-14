import { fetchRSSFeed, generateSourceId } from './rss'
import type { RawSourceItem, SourceResult } from '../types'
import type RSSParser from 'rss-parser'

const UA = 'BankScope-Intelligence/1.0 (regulatory intelligence aggregator; +https://bankscope.io)'
const BASE_BOE = 'https://www.bankofengland.co.uk'

function praCategorise(item: RSSParser.Item): import('../types').ContentType {
  const title = (item.title || '').toLowerCase()
  const cats = ((item.categories || []) as string[]).map((c) => c.toLowerCase()).join(' ')
  const all = title + ' ' + cats

  if (all.includes('consultation') || /\bcp\d/.test(all)) return 'consultation'
  if (all.includes('policy statement') || /\bps\d/.test(all) || all.includes('supervisory statement') || /\bss\d/.test(all)) return 'policy-statement'
  if (all.includes('speech')) return 'speech'
  if (all.includes('enforcement') || all.includes('final notice')) return 'enforcement'
  if (all.includes('publication') || all.includes('report') || all.includes('guidance')) return 'publication'
  return 'news'
}

function praContentType(title: string): import('../types').ContentType {
  return praCategorise({ title } as RSSParser.Item)
}

/**
 * Scrape the BoE prudential regulation news listing page.
 * Used as a fallback when all RSS/Atom feeds are unreachable.
 *
 * The BoE news listing page at /news/prudential-regulation uses a
 * server-rendered HTML structure. This scraper tries several selector
 * patterns in order of specificity, falling through to broad fallbacks.
 */
async function scrapePRANewsPage(): Promise<{ items: RawSourceItem[]; errors: string[] }> {
  const errors: string[] = []
  const items: RawSourceItem[] = []

  const pageUrl = `${BASE_BOE}/news/prudential-regulation`

  try {
    const cheerio = await import('cheerio')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15_000)
    let html: string
    try {
      const res = await fetch(pageUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': UA, Accept: 'text/html' },
      })
      if (!res.ok) {
        errors.push(`[PRA scraper] ${pageUrl} returned HTTP ${res.status}`)
        return { items, errors }
      }
      html = await res.text()
    } finally {
      clearTimeout(timer)
    }

    const $ = cheerio.load(html)
    const seen = new Set<string>()

    // ── Selector cascade: try from most specific to most general ──────────
    // Pattern 1: BoE-style news listing with .page-filter-results__result or similar wrappers
    const SELECTOR_PATTERNS: Array<{
      container: string
      titleLink: string
      date: string
      excerpt: string
    }> = [
      // BoE redesign (2024+) — filter results
      {
        container: '.page-filter-results__result, [class*="filter-result"]',
        titleLink: 'h2 a, h3 a, .result__title a',
        date: 'time, [class*="date"], [class*="Date"]',
        excerpt: 'p:not([class*="type"]):not([class*="date"]):not([class*="tag"])',
      },
      // BoE legacy news list
      {
        container: '.news-list__item, .news-item, [class*="news-list"] li',
        titleLink: 'h2 a, h3 a, a',
        date: 'time, [class*="date"], .date',
        excerpt: 'p',
      },
      // Generic article elements
      {
        container: 'article',
        titleLink: 'h2 a, h3 a, h4 a',
        date: 'time, [class*="date"], .date',
        excerpt: 'p',
      },
      // List items with a heading-level link (last resort)
      {
        container: 'main li, .content li',
        titleLink: 'h2 a, h3 a, a[href*="/prudential"], a[href*="/news"]',
        date: 'time, [class*="date"]',
        excerpt: 'p',
      },
    ]

    for (const pattern of SELECTOR_PATTERNS) {
      const elements = $(pattern.container)
      if (elements.length === 0) continue

      elements.each((_, el) => {
        const $el = $(el)
        const titleEl = $el.find(pattern.titleLink).first()
        const title = titleEl.text().trim()
        const href = titleEl.attr('href')
        if (!title || !href || title.length < 5) return

        const link = href.startsWith('http') ? href : `${BASE_BOE}${href}`
        const sourceId = generateSourceId(link, title)
        if (seen.has(sourceId)) return
        seen.add(sourceId)

        // Date extraction
        const dateEl = $el.find(pattern.date).first()
        const dateText = dateEl.attr('datetime') || dateEl.text().trim()
        let publish_date: string | null = null
        if (dateText) {
          const d = new Date(dateText)
          if (!isNaN(d.getTime())) publish_date = d.toISOString()
        }

        const excerpt = $el.find(pattern.excerpt).first().text().trim().slice(0, 600) || null

        items.push({
          source_id: sourceId,
          title,
          source_name: 'PRA',
          source_type: 'regulator',
          content_type: praContentType(title),
          publish_date,
          source_url: link,
          raw_excerpt: excerpt,
        })
      })

      if (items.length > 0) {
        console.log(`[PRA scraper] Pattern "${pattern.container}" matched ${items.length} items`)
        break // Found items — stop trying more patterns
      }
    }

    if (items.length === 0) {
      // Last-resort: grab any heading link that points to /prudential-regulation or /news
      $('a[href*="prudential-regulation"], a[href*="/news/20"]').each((_, el) => {
        const $el = $(el)
        const title = $el.text().trim()
        const href = $el.attr('href')
        if (!title || !href || title.length < 10) return

        const link = href.startsWith('http') ? href : `${BASE_BOE}${href}`
        const sourceId = generateSourceId(link, title)
        if (seen.has(sourceId)) return
        seen.add(sourceId)

        items.push({
          source_id: sourceId,
          title,
          source_name: 'PRA',
          source_type: 'regulator',
          content_type: praContentType(title),
          publish_date: null,
          source_url: link,
          raw_excerpt: null,
        })
      })

      if (items.length > 0) {
        console.log(`[PRA scraper] Last-resort link scrape found ${items.length} items`)
      } else {
        errors.push(`[PRA scraper] No items found from ${pageUrl} — page structure may have changed. Run: npm run probe -- --pra --dump-html`)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`[PRA scraper] Exception: ${msg}`)
  }

  return { items, errors }
}

export async function ingestPRA(): Promise<SourceResult & { items: RawSourceItem[] }> {
  // ── Tier 1: try known RSS/Atom feeds ────────────────────────────────────
  const { items: rssItems, errors: rssErrors, successUrl } = await fetchRSSFeed({
    // Primary: BoE PRA-specific publications RSS (confirmed via aggregators)
    url: 'https://www.bankofengland.co.uk/rss/prudential-regulation/publications',
    fallbackUrls: [
      // Variant: PRA news RSS
      'https://www.bankofengland.co.uk/rss/prudential-regulation/news',
      // Variant: generic PRA RSS (tried before, but worth trying again as BoE may have restored it)
      'https://www.bankofengland.co.uk/rss/prudential-regulation',
      // GOV.UK atom for PRA (was 404 before but may be restored)
      'https://www.gov.uk/government/organisations/prudential-regulation-authority.atom',
    ],
    source_name: 'PRA',
    source_type: 'regulator',
    default_content_type: 'news',
    categorise: praCategorise,
  })

  if (successUrl !== null && rssItems.length > 0) {
    console.log(`[PRA] RSS success via ${successUrl}: ${rssItems.length} items`)
    return {
      source_name: 'PRA',
      items_fetched: rssItems.length,
      items_new: 0,
      errors: rssErrors,
      items: rssItems,
    }
  }

  // ── Tier 2: HTML scraper fallback ────────────────────────────────────────
  console.warn('[PRA] All RSS feeds failed — falling back to HTML scraper')
  const { items: scrapedItems, errors: scrapeErrors } = await scrapePRANewsPage()

  return {
    source_name: 'PRA',
    items_fetched: scrapedItems.length,
    items_new: 0,
    errors: [...rssErrors, ...scrapeErrors],
    items: scrapedItems,
  }
}
