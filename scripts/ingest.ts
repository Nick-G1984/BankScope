#!/usr/bin/env tsx
/**
 * Manual ingestion script for BankScope Intelligence.
 * Usage: npm run ingest
 *        npm run ingest -- --source="FCA"
 *        npm run ingest -- --summarise
 */

import 'dotenv/config'
import { runAllSources, runSingleSource } from '../lib/sources'
import { processUnprocessedItems } from '../lib/ai/summarise'
import { createIngestionRun, updateIngestionRun } from '../lib/db/intelligence'

async function main() {
  const args = process.argv.slice(2)
  const sourceArg = args.find((a) => a.startsWith('--source='))?.split('=')[1]
  const summarise = args.includes('--summarise')

  console.log('\n🏦 BankScope Intelligence — Manual Ingestion')
  console.log('════════════════════════════════════════════')

  // Create a run record
  const runId = await createIngestionRun()
  console.log(`Run ID: ${runId}`)
  console.log(`Started: ${new Date().toISOString()}\n`)

  let totalFetched = 0
  let totalNew = 0
  const allErrors: string[] = []

  try {
    // Ingestion
    if (sourceArg) {
      console.log(`📡 Ingesting source: ${sourceArg}`)
      const summary = await runSingleSource(sourceArg)
      totalFetched = summary.total_fetched
      totalNew = summary.total_new
      allErrors.push(...summary.all_errors)
      printSourceResults(summary.source_results)
    } else {
      console.log('📡 Ingesting all sources…')
      const summary = await runAllSources()
      totalFetched = summary.total_fetched
      totalNew = summary.total_new
      allErrors.push(...summary.all_errors)
      printSourceResults(summary.source_results)
    }

    console.log(`\n✅ Ingestion complete`)
    console.log(`   Items fetched: ${totalFetched}`)
    console.log(`   New items:     ${totalNew}`)

    // Optionally run AI summarisation
    if (summarise) {
      console.log('\n🤖 Running AI summarisation (batch 50)…')

      if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️  OPENAI_API_KEY not set — skipping summarisation')
      } else {
        const result = await processUnprocessedItems(50)
        console.log(`✅ Summarisation complete`)
        console.log(`   Processed: ${result.processed}`)
        console.log(`   Failed:    ${result.failed}`)
        console.log(`   Duration:  ${result.duration_ms}ms`)

        if (result.errors.length > 0) {
          console.warn('\n⚠️  Summarisation errors:')
          result.errors.forEach((e) => console.warn(`   ${e}`))
          allErrors.push(...result.errors)
        }
      }
    }

    await updateIngestionRun(runId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      items_fetched: totalFetched,
      items_new: totalNew,
      error_log: allErrors.length > 0 ? allErrors.join('\n') : null,
    })

    if (allErrors.length > 0) {
      console.warn('\n⚠️  Errors encountered:')
      allErrors.forEach((e) => console.warn(`   ${e}`))
    }

    console.log('\n✅ Run complete.\n')
    process.exit(0)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('\n❌ Fatal error:', message)
    await updateIngestionRun(runId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_log: message,
    }).catch(() => {})
    process.exit(1)
  }
}

function printSourceResults(
  results: { source_name: string; items_fetched: number; items_new: number; errors: string[] }[]
) {
  console.log('\nSource results:')
  for (const r of results) {
    const statusIcon = r.errors.length > 0 ? '⚠️ ' : '✓ '
    console.log(
      `  ${statusIcon} ${r.source_name.padEnd(20)} fetched: ${String(r.items_fetched).padStart(3)}   new: ${String(r.items_new).padStart(3)}`
    )
    if (r.errors.length > 0) {
      r.errors.forEach((e) => console.warn(`     Error: ${e}`))
    }
  }
}

main()
