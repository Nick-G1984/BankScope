/**
 * Database operations for generated outputs and user credits.
 * All mutations use the admin client (service role) to bypass RLS —
 * auth is enforced at the API route layer before these functions are called.
 */

import { createAdminClient } from './client'
import type {
  GeneratedOutput,
  OutputType,
  OutputContent,
  UserProfile,
  CreditTransaction,
} from '../types'

// ── User Profile ────────────────────────────────────────────────────────────

/**
 * Get a user's profile. If it doesn't exist yet (e.g. first sign-in),
 * create it with the default 3 free credits.
 */
export async function getOrCreateUserProfile(userId: string, email?: string): Promise<UserProfile> {
  const db = createAdminClient()

  const { data: existing } = await db
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (existing) return existing as UserProfile

  // First time — create profile with signup bonus
  const { data: created, error } = await db
    .from('user_profiles')
    .insert({
      id: userId,
      email: email ?? null,
      credit_balance: 3,
      plan: 'free',
    })
    .select()
    .single()

  if (error || !created) {
    throw new Error(`Failed to create user profile: ${error?.message ?? 'unknown error'}`)
  }

  // Log the signup bonus credit transaction
  await db.from('credit_transactions').insert({
    user_id: userId,
    amount: 3,
    reason: 'signup_bonus',
    note: 'Welcome — 3 free credits on account creation',
  })

  return created as UserProfile
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db = createAdminClient()
  const { data } = await db
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return (data as UserProfile) ?? null
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'full_name' | 'organisation'>>
): Promise<void> {
  const db = createAdminClient()
  await db
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
}

// ── Credit Operations ───────────────────────────────────────────────────────

/** Check if a user has enough credits. Fast read-only check. */
export async function hasEnoughCredits(userId: string, required = 1): Promise<boolean> {
  const db = createAdminClient()
  const { data } = await db
    .from('user_profiles')
    .select('credit_balance')
    .eq('id', userId)
    .single()
  return (data?.credit_balance ?? 0) >= required
}

/**
 * Atomically deduct credits using the DB function.
 * Returns true if deduction succeeded, false if insufficient balance.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  outputId?: string
): Promise<boolean> {
  const db = createAdminClient()
  const { data, error } = await db.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: 'output_generated',
    p_output_id: outputId ?? null,
  })

  if (error) throw new Error(`Credit deduction failed: ${error.message}`)
  return data === true
}

export async function getCreditTransactions(
  userId: string,
  limit = 20
): Promise<CreditTransaction[]> {
  const db = createAdminClient()
  const { data } = await db
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as CreditTransaction[]
}

// ── Generated Outputs ───────────────────────────────────────────────────────

export async function saveGeneratedOutput(params: {
  userId: string
  intelligenceItemId: string
  outputType: OutputType
  title: string
  content: OutputContent
  sourceItemTitle: string | null
  sourceItemUrl: string | null
  sourceName: string | null
  creditsUsed?: number
}): Promise<GeneratedOutput> {
  const db = createAdminClient()

  const { data, error } = await db
    .from('generated_outputs')
    .insert({
      user_id: params.userId,
      intelligence_item_id: params.intelligenceItemId,
      output_type: params.outputType,
      title: params.title,
      content: params.content,
      source_item_title: params.sourceItemTitle,
      source_item_url: params.sourceItemUrl,
      source_name: params.sourceName,
      credits_used: params.creditsUsed ?? 1,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to save output: ${error?.message ?? 'unknown error'}`)
  }

  return data as GeneratedOutput
}

export async function getOutputById(id: string, userId: string): Promise<GeneratedOutput | null> {
  const db = createAdminClient()
  const { data } = await db
    .from('generated_outputs')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  return (data as GeneratedOutput) ?? null
}

export async function getUserOutputs(
  userId: string,
  limit = 20,
  offset = 0
): Promise<{ data: GeneratedOutput[]; total: number }> {
  const db = createAdminClient()

  const { data, error, count } = await db
    .from('generated_outputs')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new Error(`Failed to list outputs: ${error.message}`)

  return {
    data: (data ?? []) as GeneratedOutput[],
    total: count ?? 0,
  }
}
