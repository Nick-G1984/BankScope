'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition, useState, useRef, useEffect } from 'react'

// ── Static option lists ────────────────────────────────────────────────────

const SOURCES = ['FCA', 'PRA', 'Bank of England', 'ICO', 'HM Treasury', 'Companies House']
const URGENCIES = ['critical', 'high', 'medium', 'low']
const CONTENT_TYPES = [
  'press-release', 'publication', 'consultation', 'speech',
  'policy-statement', 'enforcement', 'data', 'news', 'other',
]

const FIRM_TYPES = [
  'banks',
  'building societies',
  'credit unions',
  'specialist lenders',
  'mortgage lenders',
  'consumer credit firms',
]

const PRODUCT_AREAS = [
  'mortgages',
  'savings',
  'current accounts',
  'personal loans',
  'consumer credit',
  'deposits',
  'payments',
]

const INTERNAL_FUNCTIONS = [
  'compliance',
  'risk',
  'operations',
  'PMO',
  'legal',
  'technology',
  'finance',
  'board',
]

// ── Helpers ────────────────────────────────────────────────────────────────

function toLabel(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Multi-select dropdown component ───────────────────────────────────────

interface MultiSelectProps {
  label: string
  paramKey: string          // URL param name (e.g. "firm_type")
  options: string[]
  selected: string[]
  onChange: (key: string, values: string[]) => void
}

function MultiSelectDropdown({ label, paramKey, options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  function toggle(value: string) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    onChange(paramKey, next)
  }

  const buttonLabel =
    selected.length === 0
      ? `All ${label.toLowerCase()}`
      : selected.length === 1
        ? toLabel(selected[0])
        : `${selected.length} selected`

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          'select text-sm h-9 w-full text-left flex items-center justify-between gap-2 pr-2',
          selected.length > 0 ? 'border-brand-400 bg-brand-50 text-brand-800' : '',
        ].join(' ')}
      >
        <span className="truncate">{buttonLabel}</span>
        <svg
          className={`flex-shrink-0 w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-[180px] bg-white rounded-lg border border-gray-200 shadow-lg py-1 max-h-60 overflow-y-auto">
          {options.map((opt) => {
            const checked = selected.includes(opt)
            return (
              <label
                key={opt}
                className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className={checked ? 'text-brand-800 font-medium' : 'text-gray-700'}>
                  {toLabel(opt)}
                </span>
              </label>
            )
          })}
          {selected.length > 0 && (
            <div className="border-t border-gray-100 mt-1 pt-1 px-3 pb-1">
              <button
                type="button"
                onClick={() => { onChange(paramKey, []); setOpen(false) }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Filters component ─────────────────────────────────────────────────

export function Filters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  // Single-value param helper
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

  // Multi-value param helper — stores repeated keys: ?firm_type=banks&firm_type=building+societies
  const setMultiParam = useCallback(
    (key: string, values: string[]) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete(key)
      values.forEach((v) => params.append(key, v))
      params.delete('page')
      startTransition(() => {
        router.push(`/dashboard?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  const get = (key: string) => searchParams.get(key) ?? ''
  const getAll = (key: string) => searchParams.getAll(key)

  const hasActiveFilters =
    get('source_name') || get('urgency') || get('content_type') ||
    getAll('firm_type').length > 0 ||
    getAll('product_area').length > 0 ||
    getAll('function').length > 0

  function clearAll() {
    startTransition(() => {
      router.push('/dashboard')
    })
  }

  return (
    <div className="space-y-3">
      {/* Row 1: Single-select filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
      </div>

      {/* Row 2: Multi-select filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MultiSelectDropdown
          label="Firm Type"
          paramKey="firm_type"
          options={FIRM_TYPES}
          selected={getAll('firm_type')}
          onChange={setMultiParam}
        />
        <MultiSelectDropdown
          label="Product Area"
          paramKey="product_area"
          options={PRODUCT_AREAS}
          selected={getAll('product_area')}
          onChange={setMultiParam}
        />
        <MultiSelectDropdown
          label="Internal Function"
          paramKey="function"
          options={INTERNAL_FUNCTIONS}
          selected={getAll('function')}
          onChange={setMultiParam}
        />
      </div>

      {/* Clear all filters */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            ✕ Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}
