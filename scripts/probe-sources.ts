#!/usr/bin/env tsx
/**
 * BankScope Intelligence — Source Probe Script
 *
 * Run this from your local machine (where internet access works) to:
 *  1. Confirm which PRA / ICO feed URLs are live
 *  2. Dump the first 3000 chars of HTML for pages needing scraping
 *  3. Identify the correct CSS selectors for the scraper
 *
 * Usage:
 *   npm run probe              (probe PRA + ICO)
 *   npm run probe -- --pra     (PRA only)
 *   npm run probe -- --ico     (ICO only)
 *   npm run probe -- --all     (all six data sources)
 */

import 'dotenv/config'

const UA = 'BankScope-Intelligence/1.0 (diagnostic probe; source verification)'

async function fetchWithTimeout(url: string, timeoutMs = 12_000): Promise<{
  ok: boolean
  status: number
  contentType: string | null
  body: string
  error?: string
}> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: '*/*' },
    })
    const body = await res.text()
    return {
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get('content-type'),
      body,
    }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      contentType: null,
      body: '',
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    clearTimeout(timer)
  }
}

function isXML(contentType: string | null, body: string): boolean {
  if (!contentType) return false
  if (/xml|rss|atom/.test(contentType)) return true
  // Sniff: starts with <?xml or <rss or <feed
  return /^\s*(<\?xml|<rss|<feed)/.test(body.slice(0, 200))
}

function countRSSItems(xml: string): number {
  const items = (xml.match(/<item[\s>]/gi) || []).length
  const entries = (xml.match(/<entry[\s>]/gi) || []).length
  return Math.max(items, entries)
}

async function probeURL(label: string, url: string) {
  process.stdout.write(`  ${label.padEnd(50)} `)
  const r = await fetchWithTimeout(url)

  if (!r.ok || r.error) {
    console.log(`❌  HTTP ${r.status || 'ERR'} — ${r.error || 'not OK'}`)
    return
  }

  if (isXML(r.contentType, r.body)) {
    const count = countRSSItems(r.body)
    console.log(`✅  RSS/Atom (${count} items)  [${r.contentType?.split(';')[0]}]`)
    // Print first 3 item titles (skip the feed-level <title>)
    const titleRe = /<(?:item|entry)[\s>][\s\S]*?<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/gi
    const titles: string[] = []
    let tm: RegExpExecArray | null
    while ((tm = titleRe.exec(r.body)) !== null && titles.length < 3) {
      const t = tm[1].replace(/<[^>]+>/g, '').trim()
      if (t.length > 5) titles.push(t)
    }
    titles.forEach(t => console.log(`          → ${t.slice(0, 90)}`))
  } else if (r.contentType?.includes('html') || r.body.includes('<html')) {
    console.log(`🌐  HTML page (${r.body.length.toLocaleString()} chars)  [${r.contentType?.split(';')[0]}]`)
    // Dump selectors diagnostic
    console.log('\n  ── HTML structure diagnostic (top CSS classes) ──')
    const classRe = /class="([^"]+)"/g
    const allClasses: string[] = []
    let cm: RegExpExecArray | null
    while ((cm = classRe.exec(r.body)) !== null) {
      cm[1].split(/\s+/).forEach(c => { if (c.length > 3) allClasses.push(c) })
    }
    const freq: Record<string, number> = {}
    allClasses.forEach(c => { freq[c] = (freq[c] ?? 0) + 1 })
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 40)
    console.log('  Top classes by frequency:')
    top.forEach(([cls, n]) => console.log(`    ${String(n).padStart(3)}x  .${cls}`))

    // Try to find article-like elements
    console.log('\n  ── Looking for article/list patterns ──')
    const articleMatches = r.body.match(/<(article|li)[^>]*class="[^"]*"[^>]*>/gi) || []
    articleMatches.slice(0, 5).forEach(m => console.log('  ', m))

    // First link inside what looks like a news title
    const linkMatches = r.body.match(/<h[23][^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi) || []
    console.log('\n  ── First 5 heading-level links ──')
    linkMatches.slice(0, 5).forEach(m => {
      const clean = m.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      console.log('  ', clean.slice(0, 120))
    })

    // First 3000 chars of body for manual inspection if needed
    if (process.argv.includes('--dump-html')) {
      console.log('\n  ── Raw HTML (first 3000 chars) ──')
      console.log(r.body.slice(0, 3000))
    }
  } else {
    console.log(`⚠️  Unexpected content-type: ${r.contentType}`)
  }
  console.log()
}

async function probePRA() {
  console.log('\n═══════════════════════════════════════════════════')
  console.log('  PRA — Prudential Regulation Authority')
  console.log('═══════════════════════════════════════════════════')
  await probeURL('RSS: /rss/prudential-regulation/publications', 'https://www.bankofengland.co.uk/rss/prudential-regulation/publications')
  await probeURL('RSS: /rss/prudential-regulation/news',        'https://www.bankofengland.co.uk/rss/prudential-regulation/news')
  await probeURL('RSS: /rss/prudential-regulation',             'https://www.bankofengland.co.uk/rss/prudential-regulation')
  await probeURL('HTML: /news/prudential-regulation',           'https://www.bankofengland.co.uk/news/prudential-regulation')
  await probeURL('GOV.UK atom (PRA)',                           'https://www.gov.uk/government/organisations/prudential-regulation-authority.atom')
}

async function probeICO() {
  console.log('\n═══════════════════════════════════════════════════')
  console.log('  ICO — Information Commissioner\'s Office')
  console.log('═══════════════════════════════════════════════════')
  await probeURL('RSS: enforcement feed',                       'https://ico.org.uk/global/rss-feeds/enforcement/')
  await probeURL('RSS: news-and-blogs feed',                    'https://ico.org.uk/global/rss-feeds/news-and-blogs/')
  await probeURL('RSS: decision-notices feed',                  'https://ico.org.uk/global/rss-feeds/decision-notices/')
  await probeURL('HTML: media-centre/news-and-blogs',           'https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/')
  await probeURL('HTML: action-weve-taken/enforcement',         'https://ico.org.uk/action-weve-taken/enforcement/')
  await probeURL('GOV.UK atom (ICO)',                           'https://www.gov.uk/government/organisations/information-commissioners-office.atom')
}

async function probeAll() {
  await probePRA()
  await probeICO()

  console.log('\n═══════════════════════════════════════════════════')
  console.log('  Other sources (sanity check)')
  console.log('═══════════════════════════════════════════════════')
  await probeURL('FCA GOV.UK atom',       'https://www.gov.uk/government/organisations/financial-conduct-authority.atom')
  await probeURL('BoE publications RSS',  'https://www.bankofengland.co.uk/rss/publications')
  await probeURL('HMT GOV.UK atom',       'https://www.gov.uk/government/organisations/hm-treasury.atom')
  await probeURL('Companies House atom',  'https://www.gov.uk/government/organisations/companies-house.atom')
}

async function main() {
  const args = process.argv.slice(2)
  console.log('BankScope Intelligence — Source Probe')
  console.log(`Date: ${new Date().toISOString()}`)
  console.log('Add --dump-html flag to see raw HTML for page sources')

  if (args.includes('--pra')) {
    await probePRA()
  } else if (args.includes('--ico')) {
    await probeICO()
  } else if (args.includes('--all')) {
    await probeAll()
  } else {
    await probePRA()
    await probeICO()
  }

  console.log('\nDone.\n')
}

main().catch(console.error)
