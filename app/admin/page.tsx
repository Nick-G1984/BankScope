'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Spinner } from '@/components/ui/Spinner'

interface Stats {
  total_items: number
  unprocessed: number
  today_items: number
  sources_active: number
}

interface IngestionRun {
  id: string
  started_at: string
  completed_at: string | null
  status: string
  items_fetched: number
  items_new: number
  items_processed: number
  error_log: string | null
  source_results: Array<{ source_name: string; items_fetched: number; items_new: number; errors: string[] }> | null
}

interface SourceData {
  id: string
  name: string
  source_type: string
  url: string
  is_active: boolean
  last_fetched: string | null
  // health fields added in migration-001
  last_attempted_at: string | null
  last_success_at: string | null
  last_error: string | null
  consecutive_failures: number | null
  last_items_fetched: number | null
  last_items_new: number | null
}

interface AdminPageData {
  stats: Stats
  recent_runs: IngestionRun[]
  sources: SourceData[]
}

function HealthBadge({ source }: { source: SourceData }) {
  const failures = source.consecutive_failures ?? 0
  if (!source.is_active) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Inactive</span>
  }
  if (failures >= 3) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">⚠ Failing ({failures}×)</span>
  }
  if (failures === 1 || failures === 2) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">⚠ Degraded ({failures}×)</span>
  }
  if (source.last_success_at) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">✓ Healthy</span>
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Pending</span>
}

function RunStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'completed' ? 'bg-green-100 text-green-800' :
    status === 'failed'    ? 'bg-red-100 text-red-800' :
                             'bg-yellow-100 text-yellow-800'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{status}</span>
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true })
  } catch {
    return '—'
  }
}

function shortDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'dd MMM, HH:mm')
  } catch {
    return '—'
  }
}

export default function AdminPage() {
  const [data, setData] = useState<AdminPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [adminSecret, setAdminSecret] = useState('')
  const [expandedSource, setExpandedSource] = useState<string | null>(null)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch('/api/sources')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  async function triggerIngest(source?: string) {
    if (!adminSecret) { setActionStatus('⚠ Enter your ADMIN_SECRET first'); return }
    setActionStatus(`Running ${source ? source : 'full'} ingestion…`)
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSecret}` },
        body: JSON.stringify(source ? { source } : {}),
      })
      const result = await res.json()
      if (res.ok) {
        setActionStatus(`✅ Ingestion complete — ${result.total_new ?? 0} new items (${result.total_fetched ?? 0} fetched)`)
        fetchData()
      } else {
        setActionStatus(`❌ Error: ${result.error}`)
      }
    } catch {
      setActionStatus('❌ Network error — check console')
    }
  }

  async function triggerSummarise() {
    if (!adminSecret) { setActionStatus('⚠ Enter your ADMIN_SECRET first'); return }
    setActionStatus('Running AI summarisation (all pending)…')
    try {
      const res = await fetch('/api/summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSecret}` },
        body: JSON.stringify({}),
      })
      const result = await res.json()
      if (res.ok) {
        setActionStatus(`✅ Summarisation complete — ${result.processed} processed, ${result.failed} failed`)
        fetchData()
      } else {
        setActionStatus(`❌ Error: ${result.error}`)
      }
    } catch {
      setActionStatus('❌ Network error — check console')
    }
  }

  // Count sources by health status
  const healthCounts = data?.sources.reduce(
    (acc, s) => {
      if (!s.is_active) { acc.inactive++; return acc }
      const f = s.consecutive_failures ?? 0
      if (f >= 3) acc.failing++
      else if (f > 0) acc.degraded++
      else if (s.last_success_at) acc.healthy++
      else acc.pending++
      return acc
    },
    { healthy: 0, degraded: 0, failing: 0, pending: 0, inactive: 0 }
  )

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Panel</h1>
            <p className="text-gray-500 text-sm">Ingestion control, source health monitoring, and system status.</p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm">← Dashboard</Link>
        </div>

        {/* Admin secret */}
        <div className="card p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Admin Secret</label>
          <input
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            placeholder="Enter ADMIN_SECRET to authorise actions"
            className="input max-w-sm"
          />
          <p className="text-xs text-gray-400 mt-1">Your ADMIN_SECRET from .env.local — never stored or transmitted except in action requests.</p>
        </div>

        {/* Actions */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => triggerIngest()} className="btn-primary">🔄 Run Full Ingestion</button>
            <button onClick={() => triggerSummarise()} className="btn-secondary">🤖 Run AI Summarisation</button>
            <button onClick={() => fetchData()} className="btn-secondary">↻ Refresh Status</button>
          </div>
          {actionStatus && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-700 break-all">
              {actionStatus}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner /></div>
        ) : data ? (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total items', value: data.stats.total_items },
                { label: 'Added today', value: data.stats.today_items },
                { label: 'Pending AI', value: data.stats.unprocessed, highlight: data.stats.unprocessed > 0 },
                { label: 'Active sources', value: data.stats.sources_active },
              ].map((s) => (
                <div key={s.label} className="card px-4 py-3 text-center">
                  <p className={`text-2xl font-bold ${s.highlight ? 'text-amber-600' : 'text-brand-700'}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Source health summary */}
            {healthCounts && (
              <div className="card p-4">
                <h2 className="font-semibold text-gray-900 mb-3">Source Health Overview</h2>
                <div className="flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {healthCounts.healthy} healthy
                  </span>
                  {healthCounts.degraded > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-sm font-medium">
                      <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> {healthCounts.degraded} degraded
                    </span>
                  )}
                  {healthCounts.failing > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm font-medium">
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> {healthCounts.failing} failing
                    </span>
                  )}
                  {healthCounts.pending > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> {healthCounts.pending} pending first run
                    </span>
                  )}
                  {healthCounts.inactive > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
                      <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> {healthCounts.inactive} inactive
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Source health table */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Data Sources</h2>
                <span className="text-xs text-gray-400">{data.sources.length} registered</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-5 py-3 text-left">Source</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left hidden sm:table-cell">Last success</th>
                      <th className="px-4 py-3 text-left hidden md:table-cell">Last attempt</th>
                      <th className="px-4 py-3 text-right hidden sm:table-cell">Last run</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.sources.map((s) => {
                      const failures = s.consecutive_failures ?? 0
                      const isExpanded = expandedSource === s.id
                      const rowClass = failures >= 3 ? 'bg-red-50/30' : failures > 0 ? 'bg-yellow-50/30' : ''
                      return (
                        <>
                          <tr key={s.id} className={rowClass}>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.is_active ? (failures === 0 ? 'bg-green-500' : failures < 3 ? 'bg-yellow-400' : 'bg-red-500') : 'bg-gray-300'}`} />
                                <div>
                                  <p className="font-medium text-gray-900">{s.name}</p>
                                  <p className="text-xs text-gray-400 capitalize">{s.source_type}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <HealthBadge source={s} />
                            </td>
                            <td className="px-4 py-3.5 text-gray-500 hidden sm:table-cell">
                              {relativeTime(s.last_success_at)}
                            </td>
                            <td className="px-4 py-3.5 text-gray-500 hidden md:table-cell">
                              {relativeTime(s.last_attempted_at)}
                            </td>
                            <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                              {(s.last_items_fetched != null || s.last_items_new != null) ? (
                                <span className="text-gray-500">
                                  <span className="font-medium text-gray-700">{s.last_items_fetched ?? 0}</span> fetched,{' '}
                                  <span className="font-medium text-gray-700">{s.last_items_new ?? 0}</span> new
                                </span>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {s.last_error && (
                                  <button
                                    onClick={() => setExpandedSource(isExpanded ? null : s.id)}
                                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                                  >
                                    {isExpanded ? 'Hide error' : 'View error'}
                                  </button>
                                )}
                                <button
                                  onClick={() => triggerIngest(s.name)}
                                  className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                                >
                                  Refresh
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && s.last_error && (
                            <tr className="bg-red-50">
                              <td colSpan={6} className="px-5 py-3">
                                <p className="text-xs font-medium text-red-700 mb-1">Last error</p>
                                <pre className="text-xs text-red-600 whitespace-pre-wrap break-all">{s.last_error}</pre>
                                <p className="text-xs text-red-400 mt-1">Feed URL: <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.url}</a></p>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent ingestion runs */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Recent Ingestion Runs</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {data.recent_runs.length === 0 ? (
                  <p className="px-5 py-10 text-sm text-gray-400 text-center">No ingestion runs yet — trigger one above.</p>
                ) : data.recent_runs.map((run) => {
                  const isExpanded = expandedRun === run.id
                  return (
                    <div key={run.id} className="px-5 py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <RunStatusBadge status={run.status} />
                          <span className="text-sm text-gray-700 font-medium">{shortDateTime(run.started_at)}</span>
                          <span className="text-xs text-gray-400">{relativeTime(run.started_at)}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 sm:ml-auto">
                          <span><strong className="text-gray-700">{run.items_fetched}</strong> fetched</span>
                          <span><strong className="text-gray-700">{run.items_new}</strong> new</span>
                          <span><strong className="text-gray-700">{run.items_processed}</strong> AI'd</span>
                          {(run.error_log || run.source_results) && (
                            <button
                              onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                              className="text-brand-600 hover:text-brand-800 font-medium"
                            >
                              {isExpanded ? 'Hide details' : 'Details'}
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 space-y-3">
                          {/* Per-source breakdown */}
                          {run.source_results && run.source_results.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-600 mb-1.5">Per-source results</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {run.source_results.map((sr) => (
                                  <div key={sr.source_name} className={`rounded-lg px-3 py-2 text-xs ${sr.errors.length > 0 ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-100'}`}>
                                    <p className="font-medium text-gray-800">{sr.source_name}</p>
                                    <p className="text-gray-500">{sr.items_fetched} fetched · {sr.items_new} new</p>
                                    {sr.errors.length > 0 && (
                                      <p className="text-red-600 mt-0.5 truncate" title={sr.errors[0]}>{sr.errors[0]}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Error log */}
                          {run.error_log && (
                            <div>
                              <p className="text-xs font-medium text-red-700 mb-1">Error log</p>
                              <pre className="text-xs bg-red-50 border border-red-100 p-2.5 rounded-lg overflow-auto max-h-32 text-red-700">{run.error_log}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="card p-10 text-center text-sm text-gray-400">Failed to load admin data.</div>
        )}
      </main>
      <Footer />
    </div>
  )
}
