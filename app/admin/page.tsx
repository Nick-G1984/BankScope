'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
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
}

interface SourceData {
  stats: Stats
  recent_runs: IngestionRun[]
  sources: { id: string; name: string; source_type: string; is_active: boolean; last_fetched: string | null }[]
}

export default function AdminPage() {
  const [data, setData] = useState<SourceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [adminSecret, setAdminSecret] = useState('')

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
    if (!adminSecret) { setActionStatus('Enter your ADMIN_SECRET first'); return }
    setActionStatus('Running ingestion…')
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify(source ? { source } : {}),
      })
      const result = await res.json()
      if (res.ok) {
        setActionStatus(`✅ Ingestion complete — ${result.total_new} new items added (${result.total_fetched} fetched)`)
        fetchData()
      } else {
        setActionStatus(`❌ Error: ${result.error}`)
      }
    } catch (err) {
      setActionStatus(`❌ Network error`)
    }
  }

  async function triggerSummarise() {
    if (!adminSecret) { setActionStatus('Enter your ADMIN_SECRET first'); return }
    setActionStatus('Running AI summarisation…')
    try {
      const res = await fetch('/api/summarise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ batch_size: 30 }),
      })
      const result = await res.json()
      if (res.ok) {
        setActionStatus(`✅ Summarisation complete — ${result.processed} items processed, ${result.failed} failed`)
        fetchData()
      } else {
        setActionStatus(`❌ Error: ${result.error}`)
      }
    } catch {
      setActionStatus(`❌ Network error`)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Panel</h1>
          <p className="text-gray-500 text-sm">Trigger ingestion, summarisation, and inspect system status.</p>
        </div>

        {/* Auth */}
        <div className="card p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Admin Secret (ADMIN_SECRET)</label>
          <input
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            placeholder="Enter your ADMIN_SECRET to authorise actions"
            className="input max-w-sm"
          />
          <p className="text-xs text-gray-400 mt-1">This is the ADMIN_SECRET from your .env.local. It is not stored.</p>
        </div>

        {/* Actions */}
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => triggerIngest()} className="btn-primary">
              🔄 Run Full Ingestion
            </button>
            <button onClick={() => triggerSummarise()} className="btn-secondary">
              🤖 Run AI Summarisation (batch 30)
            </button>
            <Link href="/dashboard" className="btn-secondary">
              📊 View Dashboard
            </Link>
          </div>
          {actionStatus && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-700">
              {actionStatus}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner /></div>
        ) : data ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total items', value: data.stats.total_items },
                { label: 'Added today', value: data.stats.today_items },
                { label: 'Pending AI', value: data.stats.unprocessed },
                { label: 'Active sources', value: data.stats.sources_active },
              ].map((s) => (
                <div key={s.label} className="card px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-brand-700">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Recent ingestion runs */}
            <div className="card mb-6">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Recent Ingestion Runs</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {data.recent_runs.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-gray-400 text-center">No ingestion runs yet.</p>
                ) : data.recent_runs.map((run) => (
                  <div key={run.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`badge ${run.status === 'completed' ? 'bg-green-100 text-green-800' : run.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {run.status}
                      </span>
                      <span className="text-sm text-gray-700">
                        {format(parseISO(run.started_at), 'dd MMM HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 sm:ml-auto">
                      <span>{run.items_fetched} fetched</span>
                      <span>{run.items_new} new</span>
                      <span>{run.items_processed} AI processed</span>
                    </div>
                    {run.error_log && (
                      <details className="w-full mt-1">
                        <summary className="text-xs text-red-600 cursor-pointer">Errors</summary>
                        <pre className="text-xs bg-red-50 p-2 rounded mt-1 overflow-auto max-h-24 text-red-700">{run.error_log}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sources */}
            <div className="card">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Data Sources</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {data.sources.map((s) => (
                  <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm font-medium text-gray-900">{s.name}</span>
                      <span className="text-xs text-gray-400 capitalize">{s.source_type}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {s.last_fetched && (
                        <span className="text-xs text-gray-400">
                          Last fetched {format(parseISO(s.last_fetched), 'dd MMM HH:mm')}
                        </span>
                      )}
                      <button
                        onClick={() => triggerIngest(s.name)}
                        className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  )
}
