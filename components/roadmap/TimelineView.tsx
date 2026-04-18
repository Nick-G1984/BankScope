'use client'

import { useState } from 'react'
import type {
  RegulatoryMilestone,
  RoadmapTheme,
  MilestoneStatus,
} from '@/lib/roadmap/data'
import { ROADMAP_THEMES, getTheme } from '@/lib/roadmap/data'

// ── Status badge config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; classes: string; dot: string }> = {
  live:      { label: 'Live',     classes: 'bg-green-100 text-green-800 border-green-200',    dot: 'bg-green-500' },
  known:     { label: 'Upcoming', classes: 'bg-blue-100 text-blue-800 border-blue-200',       dot: 'bg-blue-500' },
  expected:  { label: 'Expected', classes: 'bg-gray-100 text-gray-600 border-gray-200',       dot: 'bg-gray-400' },
  important: { label: 'Important',classes: 'bg-amber-100 text-amber-800 border-amber-200',    dot: 'bg-amber-500' },
  delayed:   { label: 'Delayed',  classes: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
}

function StatusBadge({ status }: { status: MilestoneStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${cfg.classes}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ── Theme badge ──────────────────────────────────────────────────────────────

function ThemeBadge({ themeId }: { themeId: string }) {
  const theme = getTheme(themeId)
  if (!theme) return null
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${theme.color.bg} ${theme.color.text} ${theme.color.border}`}>
      {theme.icon} {theme.short}
    </span>
  )
}

// ── Individual milestone card ────────────────────────────────────────────────

function MilestoneCard({
  milestone,
  showTheme = false,
}: {
  milestone: RegulatoryMilestone
  showTheme?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const theme = getTheme(milestone.theme_id)
  const hasDetail = Boolean(milestone.detail)

  return (
    <div
      className={`relative border rounded-xl bg-white overflow-hidden transition-shadow hover:shadow-md ${
        theme ? `border-l-4 ${theme.color.border.replace('border-', 'border-l-')}` : 'border-gray-200'
      }`}
    >
      {/* ── Card header ── */}
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={milestone.status} />
            {showTheme && <ThemeBadge themeId={milestone.theme_id} />}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-gray-400">{milestone.quarter}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-[10px] font-medium text-gray-500">{milestone.regulator}</span>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-gray-900 leading-snug mb-1.5">
          {milestone.title}
        </h3>

        <p className="text-xs text-gray-600 leading-relaxed">
          {milestone.description}
        </p>

        {/* ── Expand / collapse ── */}
        {hasDetail && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2.5 text-xs text-brand-600 hover:text-brand-800 font-medium"
          >
            {expanded ? '▲ Less detail' : '▼ More detail'}
          </button>
        )}
      </div>

      {/* ── Expanded detail ── */}
      {expanded && milestone.detail && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-700 leading-relaxed mb-3">{milestone.detail}</p>
          <div className="flex flex-wrap items-center gap-2">
            {milestone.tags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded px-2 py-0.5 text-[10px] bg-gray-100 text-gray-500 font-medium"
              >
                {tag}
              </span>
            ))}
            {milestone.source_url && (
              <a
                href={milestone.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-[10px] text-brand-600 hover:text-brand-800 font-medium hover:underline"
              >
                Official source ↗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Year section heading ─────────────────────────────────────────────────────

function YearHeading({ year }: { year: number }) {
  const now = new Date().getFullYear()
  const isPast = year < now
  const isCurrent = year === now
  return (
    <div className="flex items-center gap-3 my-8 first:mt-0">
      <span
        className={`text-2xl font-bold tracking-tight ${
          isCurrent ? 'text-brand-700' : isPast ? 'text-gray-400' : 'text-gray-700'
        }`}
      >
        {year}
      </span>
      {isCurrent && (
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide bg-brand-100 text-brand-700 border border-brand-200">
          Now
        </span>
      )}
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

// ── Group milestones by year and quarter for display ─────────────────────────

interface QuarterGroup {
  quarter: string
  year: number
  milestones: RegulatoryMilestone[]
}

function groupByYearQuarter(milestones: RegulatoryMilestone[]): Map<number, QuarterGroup[]> {
  const byYear = new Map<number, Map<string, QuarterGroup>>()

  for (const m of milestones) {
    if (!byYear.has(m.year)) byYear.set(m.year, new Map())
    const qMap = byYear.get(m.year)!
    if (!qMap.has(m.quarter)) {
      qMap.set(m.quarter, { quarter: m.quarter, year: m.year, milestones: [] })
    }
    qMap.get(m.quarter)!.milestones.push(m)
  }

  // Sort milestones within each quarter by month
  const result = new Map<number, QuarterGroup[]>()
  for (const [year, qMap] of Array.from(byYear.entries()).sort(([a], [b]) => a - b)) {
    const quarters = Array.from(qMap.values()).sort((a, b) =>
      a.quarter.localeCompare(b.quarter)
    )
    result.set(year, quarters)
  }

  return result
}

// ── Theme filter pills ───────────────────────────────────────────────────────

function ThemeFilterPills({
  activeTheme,
  onSelect,
}: {
  activeTheme: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelect('')}
        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          activeTheme === ''
            ? 'bg-gray-800 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        All themes
      </button>
      {ROADMAP_THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            activeTheme === t.id
              ? `${t.color.bg} ${t.color.text} ${t.color.border} ring-1 ring-offset-1 ${t.color.border}`
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
          }`}
        >
          <span>{t.icon}</span>
          {t.short}
        </button>
      ))}
    </div>
  )
}

// ── Status filter ────────────────────────────────────────────────────────────

const STATUS_FILTERS: Array<{ id: MilestoneStatus | ''; label: string }> = [
  { id: '', label: 'All status' },
  { id: 'live', label: 'Live' },
  { id: 'important', label: 'Important' },
  { id: 'known', label: 'Upcoming' },
  { id: 'expected', label: 'Expected' },
  { id: 'delayed', label: 'Delayed' },
]

// ── Main TimelineView ────────────────────────────────────────────────────────

export interface TimelineViewProps {
  milestones: RegulatoryMilestone[]
  themes: RoadmapTheme[]
}

export function TimelineView({ milestones }: TimelineViewProps) {
  const [activeTheme, setActiveTheme] = useState<string>('')
  const [activeStatus, setActiveStatus] = useState<MilestoneStatus | ''>('')

  // Filter milestones
  const filtered = milestones.filter((m) => {
    if (activeTheme && m.theme_id !== activeTheme) return false
    if (activeStatus && m.status !== activeStatus) return false
    return true
  })

  const grouped = groupByYearQuarter(filtered)
  const showThemeBadge = activeTheme === '' // only show theme pill when not filtered to one theme

  return (
    <div>
      {/* ── Filters ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Filter by theme</p>
          <ThemeFilterPills activeTheme={activeTheme} onSelect={setActiveTheme} />
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Filter by status</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => {
              const isActive = activeStatus === f.id
              const cfg = f.id ? STATUS_CONFIG[f.id as MilestoneStatus] : null
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveStatus(f.id as MilestoneStatus | '')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {cfg && (
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        isActive ? 'bg-white' : cfg.dot
                      }`}
                    />
                  )}
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Result count ── */}
      <p className="text-xs text-gray-500 mb-4">
        Showing{' '}
        <span className="font-semibold text-gray-700">{filtered.length}</span>
        {' '}of <span className="font-semibold text-gray-700">{milestones.length}</span> milestones
        {activeTheme && (
          <span> in <span className="font-medium">{getTheme(activeTheme)?.title ?? activeTheme}</span></span>
        )}
        {activeStatus && (
          <span> · <span className="font-medium">{STATUS_CONFIG[activeStatus].label}</span></span>
        )}
      </p>

      {/* ── Timeline ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-2xl mb-2">📅</p>
          <p className="text-sm">No milestones match the current filters.</p>
          <button
            type="button"
            onClick={() => { setActiveTheme(''); setActiveStatus('') }}
            className="mt-3 text-xs text-brand-600 hover:text-brand-800 underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div>
          {Array.from(grouped.entries()).map(([year, quarters]) => (
            <div key={year}>
              <YearHeading year={year} />
              <div className="space-y-6">
                {quarters.map((qg) => (
                  <div key={qg.quarter} className="relative pl-8">
                    {/* Timeline axis dot */}
                    <div className="absolute left-0 top-1 flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-brand-500 border-2 border-white shadow-sm ring-1 ring-brand-200" />
                      <div className="w-px flex-1 bg-gray-200 mt-1 min-h-full" style={{ minHeight: '100%' }} />
                    </div>

                    {/* Quarter label */}
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                      {qg.quarter}
                    </p>

                    {/* Milestone cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {qg.milestones.map((m) => (
                        <MilestoneCard
                          key={m.id}
                          milestone={m}
                          showTheme={showThemeBadge}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer note ── */}
      <div className="mt-12 border-t border-gray-200 pt-6 text-center">
        <p className="text-xs text-gray-400 leading-relaxed max-w-2xl mx-auto">
          This roadmap is maintained manually based on published regulatory announcements.
          Dates marked <span className="font-medium">&ldquo;Expected&rdquo;</span> are anticipated
          but not formally confirmed. Always verify against official regulator publications.
          <span className="block mt-1">Last updated April 2026.</span>
        </p>
      </div>
    </div>
  )
}
