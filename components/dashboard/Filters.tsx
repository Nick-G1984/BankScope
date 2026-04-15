'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

// Phase 1 filter spec: Source, Urgency, Content Type, Regulatory Theme
// Multi-select firm/product/function filters are available via API but not in the UI.

const SOURCES = ['FCA', 'PRA', 'Bank of England', 'ICO', 'HM Treasury', 'Companies House']
const URGENCIES = ['critical', 'high', 'medium', 'low']
const CONTENT_TYPES = [
  'press-release', 'publication', 'consultation', 'speech',
  'policy-statement', 'enforcement', 'data', 'news', 'other',
]
const REGULATORY_THEMES = [
  'conduct',
  'prudential',
  'consumer-duty',
  'complaints',
  'governance',
  'operational-resilience',
  'aml-fraud',
  'data-privacy',
  'market-competition',
  'other',
]

function toLabel(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function Filters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      startTransition(() => {
        router.push(`/dashboard?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  const get = (key: string) => searchParams.get(key) ?? ''

  const hasActiveFilters = get('source_name') || get('urgency') || get('content_type') || get('regulatory_theme')

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
          <select
            value={get('source_name')}
            onChange={(e) => setParam('source_name', e.target.value)}
            className="select text-sm h-9"
          >
            <option value="">All sources</option>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Urgency</label>
          <select
            value={get('urgency')}
            onChange={(e) => setParam('urgency', e.target.value)}
            className="select text-sm h-9"
          >
            <option value="">All urgency</option>
            {URGENCIES.map((u) => (
              <option key={u} value={u}>{toLabel(u)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
          <select
            value={get('content_type')}
            onChange={(e) => setParam('content_type', e.target.value)}
            className="select text-sm h-9"
          >
            <option value="">All types</option>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>{toLabel(t)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Theme</label>
          <select
            value={get('regulatory_theme')}
            onChange={(e) => setParam('regulatory_theme', e.target.value)}
            className="select text-sm h-9"
          >
            <option value="">All themes</option>
            {REGULATORY_THEMES.map((t) => (
              <option key={t} value={t}>{toLabel(t)}</option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => startTransition(() => router.push('/dashboard'))}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            ✕ Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
