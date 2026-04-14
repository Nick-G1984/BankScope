import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/client'
import { getRecentIngestionRuns, getDashboardStats } from '@/lib/db/intelligence'

export const runtime = 'nodejs'
export const revalidate = 300

export async function GET() {
  try {
    const db = createAdminClient()

    const [sourcesResult, runs, stats] = await Promise.all([
      db.from('data_sources').select('*').order('name'),
      getRecentIngestionRuns(5),
      getDashboardStats(),
    ])

    return NextResponse.json({
      sources: sourcesResult.data ?? [],
      recent_runs: runs,
      stats,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[api/sources] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
