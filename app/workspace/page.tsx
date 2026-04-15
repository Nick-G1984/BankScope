'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/components/auth/AuthProvider'
import { Spinner } from '@/components/ui/Spinner'
import type { GeneratedOutput } from '@/lib/types'
import { OUTPUT_TYPE_LABELS } from '@/lib/types'

const TYPE_ICONS: Record<string, string> = {
  delivery_brief: '📋',
  compliance_pack: '⚖️',
  governance_brief: '🏛️',
  board_summary: '👔',
  implementation_plan: '🗺️',
}

const TYPE_COLOURS: Record<string, string> = {
  delivery_brief:      'bg-blue-50 border-blue-200 text-blue-800',
  compliance_pack:     'bg-green-50 border-green-200 text-green-800',
  governance_brief:    'bg-purple-50 border-purple-200 text-purple-800',
  board_summary:       'bg-amber-50 border-amber-200 text-amber-800',
  implementation_plan: 'bg-orange-50 border-orange-200 text-orange-800',
}

export default function WorkspacePage() {
  const { user, profile, loading, accessToken } = useAuth()
  const router = useRouter()
  const [outputs, setOutputs] = useState<GeneratedOutput[]>([])
  const [total, setTotal] = useState(0)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/auth/sign-in?next=/workspace')
      return
    }
    fetchOutputs()
  }, [user, loading, accessToken])

  async function fetchOutputs() {
    if (!accessToken) return
    setFetching(true)
    try {
      const res = await fetch('/api/outputs', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const json = await res.json()
        setOutputs(json.data)
        setTotal(json.total)
      }
    } finally {
      setFetching(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">My Workspace</h1>
            <p className="text-gray-500 text-sm">
              Your generated deliverables. Each output is saved here for reference.
            </p>
          </div>
          {profile && (
            <div className="card px-4 py-3 text-right flex-shrink-0">
              <p className="text-xl font-bold text-brand-700">{profile.credit_balance}</p>
              <p className="text-xs text-gray-500">credit{profile.credit_balance !== 1 ? 's' : ''} left</p>
            </div>
          )}
        </div>

        {loading || fetching ? (
          <div className="flex justify-center py-24">
            <Spinner className="h-8 w-8" />
          </div>
        ) : outputs.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">📂</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">No deliverables yet</h2>
            <p className="text-gray-500 text-sm mb-6">
              Open any intelligence item from the dashboard and click a deliverable button to get started.
            </p>
            <Link href="/dashboard" className="btn-primary">
              Go to dashboard →
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-semibold text-gray-900">{total}</span> deliverable{total !== 1 ? 's' : ''} generated
            </p>
            <div className="space-y-3">
              {outputs.map((output) => (
                <Link
                  key={output.id}
                  href={`/workspace/${output.id}`}
                  className="card p-5 flex items-start gap-4 hover:shadow-md hover:border-brand-200 transition-all group block"
                >
                  <span className="text-2xl flex-shrink-0">{TYPE_ICONS[output.output_type] ?? '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${TYPE_COLOURS[output.output_type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {OUTPUT_TYPE_LABELS[output.output_type as keyof typeof OUTPUT_TYPE_LABELS] ?? output.output_type}
                      </span>
                      {output.source_name && (
                        <span className="text-xs text-gray-400">{output.source_name}</span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 text-sm group-hover:text-brand-700 transition-colors line-clamp-2">
                      {output.title}
                    </p>
                    {output.source_item_title && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        From: {output.source_item_title}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-gray-400">
                      {format(parseISO(output.created_at), 'd MMM yyyy')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(parseISO(output.created_at), 'HH:mm')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
