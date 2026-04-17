/**
 * Content fetcher and extractor for accepted commentary candidates.
 *
 * Two-step process:
 *   1. Fetch the page HTML and strip it to clean text
 *   2. Use GPT-4o-mini to extract structured content from the text
 *      in the context of the regulatory item being analysed
 *
 * The AI extraction step is necessary because:
 *   - Pages contain navigation, headers, footers, and unrelated content
 *   - We need the specific passage that discusses the exact regulatory item
 *   - We need structured output (summary, key points, etc.)
 *   - We need a final relevance gate: if the page does not clearly discuss
 *     the same development, the AI will return extraction_succeeded: false
 *
 * Model choice: GPT-4o-mini for extraction (fast, cheap, sufficient).
 * Temperature: 0 (deterministic extraction, not generation).
 * Max tokens: 1200 (structured JSON output).
 *
 * Failure modes:
 *   - HTTP error / timeout → extraction_succeeded: false, keeps candidate in rejected
 *   - AI returns extraction_succeeded: false → candidate rejected with reason
 *   - AI parse error → extraction_succeeded: false
 *
 * Content is always attributed to the source URL. We store the verbatim
 * excerpt as extracted from the page, not AI-generated prose.
 */

import OpenAI from 'openai'

// ── Types ──────────────────────────────────────────────────────────────────

export interface ExtractedContent {
  /** Actual page title (as extracted, may differ from search engine title) */
  title: string
  /**
   * Verbatim or near-verbatim passage extracted from the page —
   * the section most directly commenting on the regulatory development.
   * 150-300 words. NOT AI-generated prose.
   */
  retrieved_excerpt: string
  /** 2-3 sentence factual summary of what the source says */
  summary: string
  /** 2-4 key points from the source's analysis */
  key_points: string[]
  /** Does the source broadly align with / support the regulator's position? */
  reinforces_source: boolean
  /** Does the source highlight implementation risks, nuance, or challenges? */
  introduces_caution: boolean
  /** ISO date string or null if not identifiable */
  publication_date: string | null
  extraction_succeeded: boolean
  extraction_error?: string
}

// ── HTML → text ────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 12_000
const MAX_TEXT_CHARS = 10_000 // Enough for a detailed article; prevents huge AI context

/**
 * Fetch a URL and return cleaned plain text, or null on failure.
 * Strips navigation, scripts, styles, and boilerplate.
 */
export async function fetchPageText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; BankScope-Intelligence/1.0; regulatory research)',
        Accept: 'text/html,application/xhtml+xml;q=0.9,text/plain;q=0.5',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) return null

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('html') && !contentType.includes('text')) return null

    const html = await response.text()

    // Strip script, style, nav, header, footer blocks first
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
      // Replace block elements with newlines to preserve paragraph structure
      .replace(/<\/?(p|div|section|article|h[1-6]|li|br)[^>]*>/gi, '\n')
      // Strip remaining tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      // Collapse whitespace
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    return stripped.slice(0, MAX_TEXT_CHARS)
  } catch {
    return null
  }
}

// ── AI extraction ──────────────────────────────────────────────────────────

function buildExtractionPrompt(
  url: string,
  searchTitle: string,
  pageText: string,
  itemContext: string
): string {
  return `You are extracting structured information from a page published by a trusted UK financial services regulatory advisory firm.

REGULATORY ITEM CONTEXT (what we are looking for commentary on):
${itemContext}

SOURCE PAGE URL: ${url}
SOURCE PAGE TITLE (from search engine): ${searchTitle}

PAGE TEXT (truncated to ${MAX_TEXT_CHARS} chars):
---
${pageText}
---

TASK:
Extract structured commentary from this page about the regulatory development described above.

CRITICAL RULES:
1. Only extract content that clearly discusses the SAME regulatory development — same regulator, same rule/policy/instrument or clearly the same regulatory change.
2. If the page discusses a DIFFERENT regulatory matter (even if similar topic), return extraction_succeeded: false.
3. The "retrieved_excerpt" must be verbatim or near-verbatim text from the page — NOT paraphrased or AI-generated. Copy the most relevant 150-250 word passage directly.
4. The "summary" must be factual — what the source actually says — not what you think it should say.
5. If you cannot identify a clear publication date, return null.
6. Do NOT invent or extrapolate content not present in the page text.

Return JSON:
{
  "title": "exact article or page title as it appears in the content",
  "retrieved_excerpt": "verbatim extracted passage 150-250 words — the section most directly discussing the regulatory development",
  "summary": "2-3 sentences: what this source says about the development, factual only",
  "key_points": ["concrete point 1 from the source", "concrete point 2", "concrete point 3"],
  "reinforces_source": true | false,
  "introduces_caution": true | false,
  "publication_date": "YYYY-MM-DD or null",
  "extraction_succeeded": true | false,
  "extraction_error": "reason if false, else null"
}`
}

export async function extractCommentaryContent(
  url: string,
  searchTitle: string,
  itemContext: string,
  prefetchedText?: string // Tavily sometimes returns page text directly
): Promise<ExtractedContent> {
  // Use prefetched text if available, otherwise fetch
  const pageText = prefetchedText ?? (await fetchPageText(url))

  if (!pageText || pageText.trim().length < 300) {
    return failed('Page text unavailable or too short to extract from')
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return failed('OPENAI_API_KEY not set')

  const openai = new OpenAI({ apiKey })

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: buildExtractionPrompt(url, searchTitle, pageText, itemContext),
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) return failed('Empty response from extraction model')

    const parsed = JSON.parse(raw) as Partial<ExtractedContent> & {
      extraction_succeeded?: boolean
      extraction_error?: string | null
    }

    if (parsed.extraction_succeeded === false) {
      return failed(
        parsed.extraction_error ?? 'Model determined page is not about this regulatory development'
      )
    }

    return {
      title: parsed.title ?? searchTitle,
      retrieved_excerpt: parsed.retrieved_excerpt ?? '',
      summary: parsed.summary ?? '',
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
      reinforces_source: parsed.reinforces_source ?? false,
      introduces_caution: parsed.introduces_caution ?? false,
      publication_date: parsed.publication_date ?? null,
      extraction_succeeded: true,
    }
  } catch (err) {
    return failed(
      `Extraction error: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function failed(reason: string): ExtractedContent {
  return {
    title: '',
    retrieved_excerpt: '',
    summary: '',
    key_points: [],
    reinforces_source: false,
    introduces_caution: false,
    publication_date: null,
    extraction_succeeded: false,
    extraction_error: reason,
  }
}
