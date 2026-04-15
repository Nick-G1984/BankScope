#!/usr/bin/env tsx
/**
 * Reprocess AI summaries for existing intelligence items.
 *
 * Run after a prompt upgrade to refresh summaries for all or selected records.
 * Does NOT touch ingestion — only re-summarises items already in the database.
 *
 * Usage:
 *   npm run reprocess                          # missing summaries only (safe default)
 *   npm run reprocess -- --all                 # reprocess every record (use after prompt upgrade)
 *   npm run reprocess -- --missing             # explicit: only null / pending items
 *   npm run reprocess -- --all --limit=50      # all, but cap at 50 this run
 *   npm run reprocess -- --source=FCA          # limit to one source
 *   npm run reprocess -- --all --source=PRA    # reprocess all PRA items
 *   npm run reprocess -- --dry-run             # show what would run without calling OpenAI
 *   npm run reprocess -- --all --dry-run       # preview full reprocess scope
 *
 * Cost warning: --all on 240 items @ gpt-4o-mini ≈ £0.30-0.50 at April 2026 pricing.
 *
 * Environment:
 *   OPENAI_API_KEY    required (unless --dry-run)
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  required (read from .env)
 */

import 'dotenv/config'
import { reprocessItems } from '../lib/ai/summarise'

// ── CLI argument parsing ───────────────────────────────────────────────────

function parseArgs(): {
  mode: 'missing' | 'all'
  limit: number
  source: string | undefined
  dryRun: boolean
} {
  const args = process.argv.slice(2)

  const hasAll = args.includes('--all')
  const hasMissing = args.includes('--missing')
  const dryRun = args.includes('--dry-run')

  // --all takes precedence over --missing; default is 'missing'
  const mode: 'missing' | 'all' = hasAll ? 'all' : 'missing'

  const limitArg = args.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : (mode === 'all' ? 200 : 500)

  const sourceArg = args.find((a) => a.startsWith('--source='))
  const source = sourceArg ? sourceArg.split('=')[1] : undefined

  if (hasAll && hasMissing) {
    console.warn('⚠️  Both --all and --missing specified. Using --all.')
  }

  return { mode, limit, source, dryRun }
}

// ── Cost estimate ──────────────────────────────────────────────────────────

function estimateCost(itemCount: number): string {
  // gpt-4o-mini at April 2026: ~$0.15/1M input tokens, ~$0.60/1M output tokens
  // Approximate: ~600 input tokens + ~400 output tokens per item
  const inputCost = (itemCount * 600 / 1_000_000) * 0.15
  const outputCost = (itemCount * 400 / 1_000_000) * 0.60
  const totalUSD = inputCost + outputCost
  const totalGBP = totalUSD * 0.79  // approximate rate
  return `~$${totalUSD.toFixed(2)} USD / ~£${totalGBP.toFixed(2)} GBP`
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { mode, limit, source, dryRun } = parseArgs()

  console.log('\n🏦 BankScope Intelligence — Summary Reprocessor')
  console.log('══════════════════════════════════════════════')
  console.log(`Mode:       ${mode}`)
  console.log(`Limit:      ${limit} items per run`)
  console.log(`Source:     ${source ?? 'all sources'}`)
  console.log(`Dry run:    ${dryRun ? 'YES — no OpenAI calls will be made' : 'no'}`)
  console.log('')

  if (!dryRun && !process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is not set.')
    console.error('   Add it to your .env file and retry, or use --dry-run to preview.')
    process.exit(1)
  }

  if (mode === 'all' && !dryRun) {
    console.warn(`⚠️  You are about to reprocess up to ${limit} items.`)
    console.warn(`   Estimated cost: ${estimateCost(limit)}`)
    console.warn(`   This will overwrite existing AI summaries.`)
    console.warn('   Press Ctrl+C within 5 seconds to abort...\n')
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  console.log(dryRun ? '🔍 Running dry-run preview...\n' : '🤖 Starting reprocessing...\n')

  try {
    const result = await reprocessItems({
      mode,
      maxItems: limit,
      source,
      timeBudgetMs: 10 * 60 * 1000,  // 10-minute budget
      dryRun,
    })

    if (dryRun) {
      console.log('\n✅ Dry run complete. No items were modified.')
      console.log(`   To actually reprocess, remove --dry-run from the command.`)
      process.exit(0)
    }

    console.log('\n══════════════════════════════════════════════')
    console.log('✅ Reprocessing complete')
    console.log(`   Processed:  ${result.processed}`)
    console.log(`   Failed:     ${result.failed}`)
    console.log(`   Duration:   ${(result.duration_ms / 1000).toFixed(1)}s`)

    if (result.errors.length > 0) {
      console.warn(`\n⚠️  ${result.errors.length} error(s):`)
      result.errors.forEach((e) => console.warn(`   ${e}`))
    }

    // Advice if there are likely more items to process
    if (result.processed + result.failed >= limit) {
      console.log(`\n💡 Hit the ${limit}-item limit. There may be more items remaining.`)
      console.log(`   Run again to continue, or increase --limit=N.`)
    }

    console.log('')
    process.exit(result.failed > 0 ? 1 : 0)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('\n❌ Fatal error:', message)
    process.exit(1)
  }
}

main()
