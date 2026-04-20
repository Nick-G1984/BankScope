import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth/server'
import {
  getFirmClassificationBySlug,
  generateAndSaveScopeSummary,
  deductScopeCredit,
} from '@/lib/db/firm-classifications'
import { getOrCreateUserProfile } from '@/lib/db/outputs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60   // scope generation can take up to ~30 s

const CREDITS_PER_SCOPE = 1

// ── GET /api/scopes/[slug] ──────────────────────────────────────────────────
// Returns the cached scope summary for a classification.
// No credit charge — viewing cached data is always free.
// Auth is optional: anon users can see the classification meta but not user tasks.

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 })
    }

    const classification = await getFirmClassificationBySlug(slug)
    if (!classification) {
      return NextResponse.json({ error: 'Firm classification not found' }, { status: 404 })
    }

    return NextResponse.json({
      classification,
      scope_summary: classification.scope_summary ?? null,
      scope_enriched_at: classification.scope_enriched_at ?? null,
      from_cache: true,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[api/scopes] GET error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── POST /api/scopes/[slug] ─────────────────────────────────────────────────
// Generates (or force-refreshes) the scope summary for a classification.
// Costs 1 credit unless scope already exists and force !== true.
//
// Body (JSON): { force?: boolean }
//   force=false (default) — returns cached summary free of charge if it exists
//   force=true            — regenerates even if cached; costs 1 credit

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // 1. Auth — required for generation
    const { userId, user } = await requireAuth(request)

    // 2. Parse body
    const body = await request.json().catch(() => ({}))
    const force = body?.force === true

    const { slug } = params
    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 })
    }

    // 3. Fetch classification
    const classification = await getFirmClassificationBySlug(slug)
    if (!classification) {
      return NextResponse.json({ error: 'Firm classification not found' }, { status: 404 })
    }

    // 4. Determine if generation is needed
    const needsGeneration = force || !classification.scope_enriched_at || !classification.scope_summary

    // 5. If cached and not forced — return free
    if (!needsGeneration) {
      return NextResponse.json({
        scope_summary: classification.scope_summary,
        scope_enriched_at: classification.scope_enriched_at,
        from_cache: true,
        credits_used: 0,
      })
    }

    // 6. Check credits
    const profile = await getOrCreateUserProfile(userId, user.email)
    if (profile.credit_balance < CREDITS_PER_SCOPE) {
      return NextResponse.json({
        error: 'Insufficient credits',
        code: 'insufficient_credits',
        credit_balance: profile.credit_balance,
      }, { status: 402 })
    }

    // 7. Generate scope summary via OpenAI
    const { summary, fromCache } = await generateAndSaveScopeSummary(classification, force)

    // 8. Deduct credit only if we actually generated (not served from cache)
    let creditsUsed = 0
    if (!fromCache) {
      const deducted = await deductScopeCredit(userId, classification.id)
      if (!deducted) {
        // Race condition — generation succeeded but credit deduction failed; log for reconciliation
        console.warn(`[api/scopes] Credit deduction race condition for user ${userId}, scope ${slug}`)
      }
      creditsUsed = 1
    }

    return NextResponse.json({
      scope_summary: summary,
      scope_enriched_at: new Date().toISOString(),
      from_cache: fromCache,
      credits_used: creditsUsed,
      credits_remaining: profile.credit_balance - creditsUsed,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[api/scopes] POST error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
