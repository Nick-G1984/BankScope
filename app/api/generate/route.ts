import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth/server'
import { generateOutput } from '@/lib/ai/generate-output'
import { getIntelligenceItemById } from '@/lib/db/intelligence'
import {
  getOrCreateUserProfile,
  saveGeneratedOutput,
  deductCredits,
} from '@/lib/db/outputs'
import type { OutputType } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Generation can take up to 30 seconds for complex outputs
export const maxDuration = 60

const VALID_OUTPUT_TYPES: OutputType[] = [
  'delivery_brief',
  'compliance_pack',
  'governance_brief',
  'board_summary',
  'implementation_plan',
]

const CREDITS_PER_OUTPUT = 1

/**
 * POST /api/generate
 * Body: { item_id: string, output_type: OutputType }
 * Auth: Bearer token required
 *
 * Flow:
 * 1. Verify auth
 * 2. Check credits
 * 3. Fetch intelligence item
 * 4. Generate output with OpenAI
 * 5. Save output to DB
 * 6. Deduct credits atomically
 * 7. Return output
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const { userId, user } = await requireAuth(request)

    // 2. Parse body
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { item_id, output_type } = body as { item_id?: string; output_type?: string }

    if (!item_id || typeof item_id !== 'string') {
      return NextResponse.json({ error: 'item_id is required' }, { status: 400 })
    }

    if (!output_type || !VALID_OUTPUT_TYPES.includes(output_type as OutputType)) {
      return NextResponse.json({
        error: `output_type must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`,
      }, { status: 400 })
    }

    // 3. Check credits
    const profile = await getOrCreateUserProfile(userId, user.email)
    if (profile.credit_balance < CREDITS_PER_OUTPUT) {
      return NextResponse.json({
        error: 'Insufficient credits',
        code: 'insufficient_credits',
        credit_balance: profile.credit_balance,
      }, { status: 402 })
    }

    // 4. Fetch the intelligence item
    const item = await getIntelligenceItemById(item_id)
    if (!item) {
      return NextResponse.json({ error: 'Intelligence item not found' }, { status: 404 })
    }

    // 5. Generate with OpenAI
    const { content, title } = await generateOutput({
      item,
      outputType: output_type as OutputType,
    })

    // 6. Save output to DB
    const savedOutput = await saveGeneratedOutput({
      userId,
      intelligenceItemId: item_id,
      outputType: output_type as OutputType,
      title,
      content,
      sourceItemTitle: item.title,
      sourceItemUrl: item.source_url,
      sourceName: item.source_name,
      creditsUsed: CREDITS_PER_OUTPUT,
    })

    // 7. Deduct credits (atomic) — output is already saved, so deduction is safe
    const deducted = await deductCredits(userId, CREDITS_PER_OUTPUT, savedOutput.id)
    if (!deducted) {
      // Edge case: credits were depleted between check and deduction (race condition)
      // Output is saved but credits not deducted — log for reconciliation
      console.warn(
        `[api/generate] Credit deduction race condition for user ${userId}, output ${savedOutput.id}`
      )
    }

    return NextResponse.json({
      output: savedOutput,
      credits_remaining: profile.credit_balance - CREDITS_PER_OUTPUT,
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[api/generate] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
