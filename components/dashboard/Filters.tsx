'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

const SOURCES = ['FCA', 'PRA', 'Bank of England', 'ICO', 'HM Treasury', 'Companies House']
const URGENCIES = ['critical', 'high', 'medium', 'low']
const CONTENT_TYPES = [
  'press-release', 'publication', 'consultation', 'speech',
  'policy-statement', 'enforcement', 'data', 'news', 'other',
]
const AUDIENCES = [
  'banks', 'building societies', 'savings providers', 'current account providers',
  'personal loan lenders', 'specialist lenders', 'credit unions', 'mortgage lenders',
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

  return (
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
        <label className="block text-xs font-medium text-gray-500 mb-1">Audience</label>
        <select
          value={get('audience')}
          onChange={(e) => setParam('audience', e.target.value)}
          className="select text-sm h-9"
        >
          <option value="">All audiences</option>
          {AUDIENCES.map((a) => (
            <option key={a} value={a}>{toLabel(a)}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
