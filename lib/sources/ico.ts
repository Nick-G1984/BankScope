import { fetchRSSFeed, generateSourceId, extractExcerpt } from './rss'
import type { RawSourceItem, SourceResult } from '../types'
import type RSSParser from 'rss-parser'

function icoCategorise(item: RSSParser.Item): import('../types').ContentType {
  const title = (item.title || '').toLowerCase()
  if (title.includes('fine') || title.includes('enforcement') || title.includes('penalty') || title.includes('reprimand') || title.includes('action')) {
    return 'enforcement'
  }
  if (title.includes('consultation') || title.includes('guidance') || title.includes('code of practice')) return 'consultation'
  if (title.includes('report') || title.includes('publication') || title.includes('research')) return 'publication'
  return 'news'
}

/**
 * Cheerio-based scraper for ico.org.uk news page.
 * Used as a last resort when no RSS feed is reachable.
 */
async function scrapeICONewsPage(): Promise<{ items: RawSourceItem[]; errors: string[] }> {
  const errors: string[] = []
  const items: RawSourceItem[] = []

  try {
    // Dynamic import so cheerio stays server-side only
    const cheerio = await import('cheerio')
    const baseUrl = 'https://ico.org.uk'
    const pageUrl = `${baseUrl}/about-the-ico/news-and-events/news-and-blogs/`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)

    let html: string
    try {
      const res = await fetch(pageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'BankScope-Intelligence/1.0 (regulatory intelligence aggregator)',
          'Accept': 'text/html',
        },
      })
      html = await res.text()
    } finally {
      clearTimeout(timer)
    }

    const $ = cheerio.load(html)

    // ICO news listing — article cards typically have h2/h3 links + date + excerpt
    // Selectors are broad enough to survive minor HTML changes
    const seen = new Set<string>()

    $('article, .news-item, .listing-item, .search-results__item').each((_, el) => {
      const $el = $(el)

      const titleEl = $el.find('h2 a, h3 a, .title a').first()
      const title = titleEl.text().trim()
      const href = titleEl.attr('href')
      if (!title || !href) return

      const link = href.startsWith('http') ? href : `${baseUrl}${href}`
      const sourceId = generateSourceId(link, title)
      if (seen.has(sourceId)) return
      seen.add(sourceId)

      // Try to extract a date
      const dateText = $el.find('time, .date, .publish-date').first().attr('datetime')
        || $el.find('time, .date, .publish-date').first().text().trim()
      let publish_date: string | null = null
      if (dateText) {
        const d = new Date(dateText)
        if (!isNaN(d.getTime())) publish_date = d.toISOString()
      }

      // Excerpt
      const excerpt = $el.find('p, .summary, .description').first().text().trim().slice(0, 600) || null

      const lcTitle = title.toLowerCase()
      let content_type: import('../types').ContentType = 'news'
      if (lcTitle.includes('fine') || lcTitle.includes('enforcement') || lcTitle.includes('penalty') || lcTitle.includes('reprimand')) {
        content_type = 'enforcement'
      } else if (lcTitle.includes('consultation') || lcTitle.includes('guidance')) {
        content_type = 'consultation'
      } else if (lcTitle.includes('report') || lcTitle.includes('publication')) {
        content_type = 'publication'
      }

      items.push({
        source_id: sourceId,
        title,
        source_name: 'ICO',
        source_type: 'regulator',
        content_type,
        publish_date,
        source_url: link,
        raw_excerpt: excerpt,
      })
    })

    if (items.length === 0) {
      errors.push('[ICO] Scraper found 0 items — page structure may have changed')
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`[ICO] Scraper failed: ${msg}`)
  }

  return { items, errors }
}

export async function ingestICO(): Promise<SourceResult & { items: RawSourceItem[] }> {
  // Try RSS feeds first (multiple known URLs)
  const { items: rssItems, errors: rssErrors, successUrl } = await fetchRSSFeed({
    // Primary blog RSS
    url: 'https://ico.org.uk/about-the-ico/news-and-events/news-and-blogs/rss/',
    fallbackUrls: [
      // Older WordPress-style feed
      'https://ico.org.uk/feed/',
      // GOV.UK atom (limited coverage but reliable)
      'https://www.gov.uk/government/organisations/information-commissioners-office.atom',
    ],
    source_name: 'ICO',
    source_type: 'regulator',
    default_content_type: 'news',
    categorise: icoCategorise,
  })

  // If all RSS feeds failed, fall back to HTML scraping
  if (successUrl === null) {
    console.warn('[ICO] All RSS feeds failed, falling back to HTML scraper')
    const { items: scrapedItems, errors: scrapeErrors } = await scrapeICONewsPage()
    return {
      source_name: 'ICO',
      items_fetched: scrapedItems.length,
      items_new: 0,
      errors: [...rssErrors, ...scrapeErrors],
      items: scrapedItems,
    }
  }

  return {
    source_name: 'ICO',
    items_fetched: rssItems.length,
    items_new: 0,
    errors: rssErrors,
    items: rssItems,
  }
}
