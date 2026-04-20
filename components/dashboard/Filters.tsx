'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import {
  SOURCE_REGISTRY,
  CORE_FS_SOURCES,
  ADJACENT_SOURCES,
  SECTOR_SPECIFIC_SOURCES,
} from '@/lib/sources/source-registry'
import { FIRM_CLASSIFICATION_STUBS } from '@/lib/db/firm-classifications'

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

// Source group definitions for the pill filter
const SOURCE_GROUPS = [
  { id: '',               label: 'All sources',  sources: [] as string[] },
  { id: 'core_fs',        label: 'Core FS',      sources: CORE_FS_SOURCES },
  { id: 'adjacent',       label: 'Adjacent',     sources: ADJACENT_SOURCES },
  { id: 'sector_specific', label: 'Sector',      sources: SECTOR_SPECIFIC_SOURCES },
] as const

function toLabel(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Returns source names visible given the current source_group selection */
function visibleSources(sourceGroup: string): string[] {
  if (sourceGroup === 'core_fs') return CORE_FS_SOURCES
  if (sourceGroup === 'adjacent') return ADJACENT_SOURCES
  if (sourceGroup === 'sector_specific') return SECTOR_SPECIFIC_SOURCES
  return Object.keys(SOURCE_REGISTRY)
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

  /** Switch source group; clear source_name if it's not in the new group.
   *  Also clears firm_classification since the two filters are mutually exclusive. */
  const setSourceGroup = useCallback(
    (groupId: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('page')
      params.delete('firm_classification') // mutually exclusive with source group

      if (groupId) {
        params.set('source_group', groupId)
        const currentSource = params.get('source_name')
        if (currentSource) {
          const groupSources = visibleSources(groupId)
          if (!groupSources.includes(currentSource)) {
            params.delete('source_name')
          }
        }
      } else {
        params.delete('source_group')
      }

      startTransition(() => {
        router.push(`/dashboard?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  /** Select a firm classification.
   *  Clears source_group and source_name since the classification drives the source filter. */
  const setFirmClassification = useCallback(
    (slug: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('page')
      params.delete('source_group')   // mutually exclusive
      params.delete('source_name')    // classification drives this implicitly

      if (slug) {
        params.set('firm_classification', slug)
      } else {
        params.delete('firm_classification')
      }

      startTransition(() => {
        router.push(`/dashboard?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  const activeGroup = get('source_group')
  const activeFirmClassification = get('firm_classification')
  const activeSources = visibleSources(activeGroup)

  // When a firm classification is active, grey out source-level filters
  const sourceFiltersDisabled = Boolean(activeFirmClassification)

  const hasActiveFilters =
    get('firm_classification') ||
    get('source_group') ||
    get('source_name') ||
    get('urgency') ||
    get('content_type') ||
    get('regulatory_theme')

  const selectedClassification = activeFirmClassification
    ? FIRM_CLASSIFICATION_STUBS.find((c) => c.slug === activeFirmClassification)
    : null

  return (
    <div className="space-y-3">
      {/* ── Firm type selector ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-gray-500">Firm type</p>
          {selectedClassification && (
            <Link
              href={`/scopes/${selectedClassification.slug}`}
              className="text-[11px] text-brand-600 hover:text-brand-800 font-medium transition-colors"
            >
              View regulatory scope →
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFirmClassification('')}
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !activeFirmClassification
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            All firm types
          </button>
          {FIRM_CLASSIFICATION_STUBS.map((c) => {
            const isActive = activeFirmClassification === c.slug
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => setFirmClassification(isActive ? '' : c.slug)}
                title={c.description}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                {c.name}
              </button>
            )
          })}
        </div>
        {selectedClassification && (
          <p className="mt-1.5 text-[11px] text-gray-400 leading-snug">
            Filtering to publications from{' '}
            <span className="font-medium text-gray-600">{selectedClassification.regulators.join(', ')}</span>.{' '}
            This narrows by source, not obligation — items from other regulators that apply to{' '}
            {selectedClassification.name}s may not appear.
          </p>
        )}
      </div>

      {/* ── Source group pills (hidden when firm classification active) ─────── */}
      {!sourceFiltersDisabled && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Source group</p>
          <div className="flex flex-wrap gap-1.5">
            {SOURCE_GROUPS.map((g) => {
              const isActive = activeGroup === g.id
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSourceGroup(g.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  {g.label}
                  {g.id && (
                    <span
                      className={`text-[10px] font-normal ${isActive ? 'text-brand-200' : 'text-gray-400'}`}
                    >
                      {g.sources.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Filter dropdowns ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Source dropdown — disabled when firm classification is active */}
        <div className={sourceFiltersDisabled ? 'opacity-40 pointer-events-none' : ''}>
          <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
          <select
            value={get('source_name')}
            onChange={(e) => setParam('source_name', e.target.value)}
            className="select text-sm h-9"
            disabled={sourceFiltersDisabled}
          >
            <option value="">
              {activeGroup
                ? `All ${SOURCE_GROUPS.find((g) => g.id === activeGroup)?.label ?? ''}`
                : 'All sources'}
            </option>
            {activeSources.map((name) => (
              <option key={name} value={name}>
                {SOURCE_REGISTRY[name]?.display_name ?? name}
              </option>
            ))}
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
