import { fetchRSSFeed, generateSourceId } from './rss'
import type { RawSourceItem, SourceResult } from '../types'
import type RSSParser from 'rss-parser'

const UA = 'BankScope-Intelligence/1.0 (regulatory intelligence aggregator; +https://bankscope.io)'
const BASE_BOE = 'https://www.bankofengland.co.uk'

// ── Content-type classifiers ───────────────────────────────────────────────

function praCategorise(item: RSSParser.Item): import('../types').ContentType {
  const title = (item.title || '').toLowerCase()
  const cats = ((item.categories || []) as string[]).map((c) => c.toLowerCase()).join(' ')
  const all = title + ' ' + cats

  if (all.includes('consultation') || /\bcp\d/.test(all)) return 'consultation'
  if (
    all.includes('policy statement') ||
    /\bps\d/.test(all) ||
    all.includes('supervisory statement') ||
    /\bss\d/.test(all)
  )
    return 'policy-statement'
  if (all.includes('speech')) return 'speech'
  if (all.includes('enforcement') || all.includes('final notice')) return 'enforcement'
  if (
    all.includes('report') ||
    all.includes('digest') ||
    all.includes('publication') ||
    all.includes('guidance')
  )
    return 'publication'
  return 'news'
}

function releaseTagToContentType(tag: string): import('../types').ContentType {
  const t = tag.toLowerCase()
  if (t.includes('consultation')) return 'consultation'
  if (t.includes('policy statement') || t.includes('supervisory statement')) return 'policy-statement'
  if (t.includes('speech')) return 'speech'
  if (t.includes('enforcement') || t.includes('final notice')) return 'enforcement'
  if (t.includes('digest') || t.includes('report') || t.includes('publication') || t.includes('research'))
    return 'publication'
  return 'news'
}

// ── BoE internal API fallback ──────────────────────────────────────────────

/**
 * BoE internal jQuery Ajax endpoint — discovered April 2026 via browser
 * network inspection of /news/prudential-regulation.
 *
 * The page's boe.min.js does:
 *   $.ajax({ url: '/_api/News/RefreshPagedNewsList', type: 'post', data: p })
 * where p = { Id, PageSize, NewsTypes, NewsTypesAvailable, Taxonomies,
 *             TaxonomiesAvailable, Page, Direction, Grid, InfiniteScrolling }
 *
 * Config values read from CP.BOE on the page (April 2026):
 *   Id:        {CE377CC8-BFBC-418B-B4D9-DBC1C64774A8}   (PRA news data source)
 *   PageSize:  30
 *   NewsTypes: ['65d34b0d42784c6bb1dd302c1ed63653']
 *
 * Response JSON: { Results: '<html string>', Refiners: '<html string>' }
 * Each article card is a <div class="col3"><a class="release"> ... </a></div>
 * containing: <time datetime="YYYY-MM-DD">, <h3 itemprop="name">, <div class="release-tag">
 */
const BOE_API_URL = `${BASE_BOE}/_api/News/RefreshPagedNewsList`
const BOE_PRA_DATA_SOURCE_ID = '{CE377CC8-BFBC-418B-B4D9-DBC1C64774A8}'
const BOE_PRA_NEWS_TYPE = '65d34b0d42784c6bb1dd302c1ed63653'

async function fetchBOEApiPage(page = 1): Promise<{ items: RawSourceItem[]; errors: string[] }> {
  const errors: string[] = []
  const items: RawSourceItem[] = []

  const body = new URLSearchParams()
  body.append('Id', BOE_PRA_DATA_SOURCE_ID)
  body.append('PageSize', '30')
  body.append('NewsTypes', BOE_PRA_NEWS_TYPE)
  body.append('NewsTypesAvailable', BOE_PRA_NEWS_TYPE)
  body.append('Taxonomies', '')
  body.append('TaxonomiesAvailable', '')
  body.append('Page', String(page))
  body.append('Direction', '1')
  body.append('Grid', 'false')
  body.append('InfiniteScrolling', 'false')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)

  try {
    const res = await fetch(BOE_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': UA,
        Accept: 'application/json, text/javascript, */*',
      },
      body: body.toString(),
    })

    if (!res.ok) {
      errors.push(`[PRA API] HTTP ${res.status} from ${BOE_API_URL}`)
      return { items, errors }
    }

    const data = (await res.json()) as { Results?: string; Refiners?: string }
    if (!data.Results) {
      errors.push('[PRA API] Response missing Results field')
      return { items, errors }
    }

    // Parse the rendered HTML with cheerio
    const cheerio = await import('cheerio')
    const $ = cheerio.load(data.Results)

    $('.col3 a.release').each((_, el) => {
      const $el = $(el)
      const href = $el.attr('href')
      if (!href) return

      const link = href.startsWith('http') ? href : `${BASE_BOE}${href}`

      // Title: prefer list-view h3 (same text, just avoids duplicates from grid/list h3 pair)
      const title =
        $el.find('h3.list, h3[itemprop="name"]').first().text().trim() ||
        $el.find('h3').first().text().trim()
      if (!title || title.length < 5) return

      // Date from <time datetime="...">
      const dateAttr = $el.find('time.release-date').attr('datetime')
      let publish_date: string | null = null
      if (dateAttr) {
        const d = new Date(dateAttr)
        if (!isNaN(d.getTime())) publish_date = d.toISOString()
      }

      // Content type from release-tag text, e.g. "Prudential Regulation // Consultation paper"
      const tagText = $el.find('.release-tag').text().trim()
      const tagPart = tagText.includes('//') ? tagText.split('//')[1].trim() : tagText
      const content_type = tagPart ? releaseTagToContentType(tagPart) : praCategorise({ title } as RSSParser.Item)

      items.push({
        source_id: generateSourceId(link, title),
        title,
        source_name: 'PRA',
        source_type: 'regulator',
        content_type,
        publish_date,
        source_url: link,
        raw_excerpt: null,
      })
    })

    console.log(`[PRA API] Page ${page}: ${items.length} items`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`[PRA API] Exception on page ${page}: ${msg}`)
  } finally {
    clearTimeout(timer)
  }

  return { items, errors }
}

// ── Main ingest ────────────────────────────────────────────────────────────

export async function ingestPRA(): Promise<SourceResult & { items: RawSourceItem[] }> {
  const allItems: RawSourceItem[] = []
  const allErrors: string[] = []
  const seen = new Set<string>()

  // ── Tier 1: Dedicated PRA publications RSS ─────────────────────────────
  // URL confirmed live April 2026 from bankofengland.co.uk/rss page.
  // Returns 50 items covering CP, PS, SS, digests, speeches.
  // Previous code used /rss/prudential-regulation/publications (404) —
  // the correct URL omits the slash: /rss/prudential-regulation-publications
  const rssResult = await fetchRSSFeed({
    url: `${BASE_BOE}/rss/prudential-regulation-publications`,
    fallbackUrls: [
      // Broader BoE news RSS — contains some PRA news items among wider BoE news
      `${BASE_BOE}/rss/news`,
    ],
    source_name: 'PRA',
    source_type: 'regulator',
    default_content_type: 'publication',
    categorise: praCategorise,
  })

  if (rssResult.successUrl !== null && rssResult.items.length > 0) {
    console.log(`[PRA] RSS via ${rssResult.successUrl}: ${rssResult.items.length} items`)

    // If we fell back to the generic /rss/news feed, filter to PRA-relevant items only
    const isPRAFeed = rssResult.successUrl.includes('prudential-regulation')
    const filtered = isPRAFeed
      ? rssResult.items
      : rssResult.items.filter(
          (item) =>
            (item.source_url ?? '').includes('/prudential-regulation') ||
            (item.source_url ?? '').includes('/pra') ||
            item.title.toLowerCase().includes('prudential') ||
            /\b(cp|ps|ss)\d+\/\d+/i.test(item.title)
        )

    for (const item of filtered) {
      if (!seen.has(item.source_id)) {
        seen.add(item.source_id)
        allItems.push(item)
      }
    }
  } else {
    allErrors.push(...rssResult.errors)
    console.warn('[PRA] All RSS feeds failed — falling back to BoE internal API')
  }

  // ── Tier 2: BoE internal API (supplement or fallback) ──────────────────
  // Always run the API to supplement the RSS with any items not yet captured
  // (the RSS cap is 50 items; the API gives the same pool sorted by date).
  // If RSS succeeded we just deduplicate; if it failed we rely on API entirely.
  const { items: apiItems, errors: apiErrors } = await fetchBOEApiPage(1)
  allErrors.push(...apiErrors)

  for (const item of apiItems) {
    if (!seen.has(item.source_id)) {
      seen.add(item.source_id)
      allItems.push(item)
    }
  }

  if (allItems.length === 0) {
    allErrors.push(
      '[PRA] Zero items from both RSS and API. Check network access to bankofengland.co.uk.'
    )
  }

  console.log(`[PRA] Total unique items: ${allItems.length}`)

  return {
    source_name: 'PRA',
    items_fetched: allItems.length,
    items_new: 0,
    errors: allErrors,
    items: allItems,
  }
}
