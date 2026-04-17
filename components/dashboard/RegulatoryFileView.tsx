'use client'

/**
 * RegulatoryFileView
 *
 * Full intelligence dossier UI for a regulatory file.
 * Renders all 10 sections of the structured regulatory file in a
 * professional "dossier" layout, with clear attribution labelling
 * throughout so users always know the epistemic status of each point.
 *
 * Attribution colour system:
 *   explicit           → green border / green label
 *   likely_implication → amber border / amber label
 *   ai_interpretation  → blue border / blue label  (flagged for validation)
 *   ai_knowledge       → gray border / gray label  (commentary only)
 */

import { useState } from 'react'
import type {
  RegulatoryFile,
  OperativePoint,
  ActionTrigger,
  AmbiguityArea,
  LikelyArtefact,
  ExternalCommentary,
} from '@/lib/types/regulatory-file'

// ── Attribution badge helpers ───────────────────────────────────────────────

const ATTR_CONFIG = {
  explicit: {
    label: 'Explicit in source',
    classes: 'bg-green-50 text-green-800 border border-green-200',
    dot: 'bg-green-500',
  },
  likely_implication: {
    label: 'Likely implication',
    classes: 'bg-amber-50 text-amber-800 border border-amber-200',
    dot: 'bg-amber-500',
  },
  ai_interpretation: {
    label: 'AI interpretation — validate',
    classes: 'bg-blue-50 text-blue-800 border border-blue-200',
    dot: 'bg-blue-500',
  },
  ai_knowledge: {
    label: 'AI knowledge — not verified',
    classes: 'bg-gray-100 text-gray-600 border border-gray-200',
    dot: 'bg-gray-400',
  },
} as const

function AttributionBadge({ type }: { type: keyof typeof ATTR_CONFIG }) {
  const cfg = ATTR_CONFIG[type] ?? ATTR_CONFIG.ai_knowledge
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.classes}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ── Priority badge ──────────────────────────────────────────────────────────

const PRIORITY_CFG = {
  high:   'bg-red-100 text-red-700 border border-red-200',
  medium: 'bg-amber-100 text-amber-700 border border-amber-200',
  low:    'bg-gray-100 text-gray-600 border border-gray-200',
} as const

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PRIORITY_CFG[priority]}`}>
      {priority}
    </span>
  )
}

// ── Clarity badge ───────────────────────────────────────────────────────────

const CLARITY_CFG = {
  clear:       'bg-green-50 text-green-700 border border-green-200',
  ambiguous:   'bg-amber-50 text-amber-700 border border-amber-200',
  interpretive:'bg-blue-50 text-blue-700 border border-blue-200',
  needs_legal: 'bg-red-50 text-red-700 border border-red-200',
} as const

function ClarityBadge({ clarity }: { clarity: keyof typeof CLARITY_CFG }) {
  const labels = {
    clear: 'Clear',
    ambiguous: 'Ambiguous',
    interpretive: 'Requires judgement',
    needs_legal: 'Needs legal counsel',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${CLARITY_CFG[clarity]}`}>
      {labels[clarity] ?? clarity}
    </span>
  )
}

// ── Trigger category label ──────────────────────────────────────────────────

function toTriggerLabel(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  number,
  title,
  children,
  defaultOpen = true,
}: {
  number: number
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
          {number}
        </span>
        <span className="flex-1 font-semibold text-gray-900 text-sm">{title}</span>
        <span className="text-gray-400 text-lg leading-none">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 bg-white border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Card primitive ──────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-gray-200 rounded-lg p-4 bg-gray-50 ${className}`}>
      {children}
    </div>
  )
}

// ── OperativePoint card ─────────────────────────────────────────────────────

function OperativePointCard({ point, index }: { point: OperativePoint; index: number }) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 font-medium leading-relaxed mb-2">{point.point}</p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <AttributionBadge type={point.attribution} />
          </div>
          {point.source_basis && (
            <p className="text-xs text-gray-500 leading-relaxed mb-1">
              <span className="font-semibold text-gray-600">Source basis: </span>
              {point.source_basis}
            </p>
          )}
          {point.relevance_to_firms && (
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-600">Relevance: </span>
              {point.relevance_to_firms}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ActionTrigger card ──────────────────────────────────────────────────────

function ActionTriggerCard({ trigger, index }: { trigger: ActionTrigger; index: number }) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <span className="flex-shrink-0 mt-0.5 text-gray-400 text-sm font-mono">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 font-medium leading-relaxed mb-2">{trigger.trigger}</p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <PriorityBadge priority={trigger.priority} />
            <AttributionBadge type={trigger.attribution} />
            <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 font-medium">
              {toTriggerLabel(trigger.category)}
            </span>
          </div>
          {trigger.notes && (
            <p className="text-xs text-gray-500 leading-relaxed">{trigger.notes}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── AmbiguityArea card ──────────────────────────────────────────────────────

function AmbiguityAreaCard({ area }: { area: AmbiguityArea }) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <p className="text-sm text-gray-900 font-medium leading-relaxed flex-1">{area.area}</p>
        <ClarityBadge clarity={area.clarity} />
      </div>
      {area.why_unclear && (
        <p className="text-xs text-gray-500 leading-relaxed mb-2">
          <span className="font-semibold text-gray-600">Why unclear: </span>
          {area.why_unclear}
        </p>
      )}
      {area.suggested_resolution && (
        <p className="text-xs text-blue-700 leading-relaxed bg-blue-50 rounded px-3 py-2 border border-blue-100">
          <span className="font-semibold">Suggested resolution: </span>
          {area.suggested_resolution}
        </p>
      )}
    </div>
  )
}

// ── VerifiedCommentaryCard ──────────────────────────────────────────────────
// Only renders entries where attribution='fetched' and verified=true.
// All other entries are silently excluded — they should never reach the DB
// but this component provides a final safety net.

const SOURCE_CATEGORY_LABELS: Record<string, string> = {
  big4: 'Big Four',
  law_firm: 'Law firm',
  regulator_followup: 'Regulator follow-up',
  industry_body: 'Industry body',
  news_analysis: 'News / analysis',
  other: 'Other',
}

function VerifiedCommentaryCard({ c }: { c: ExternalCommentary }) {
  const [excerptOpen, setExcerptOpen] = useState(false)

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* ── Header ── */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{c.source_name}</span>
            <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 font-medium">
              {SOURCE_CATEGORY_LABELS[c.source_category] ?? c.source_category}
            </span>
            {c.reinforces_source && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] bg-green-50 text-green-700 border border-green-200">
                ✓ Reinforces regulator
              </span>
            )}
            {c.introduces_caution && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                ⚠ Adds implementation nuance
              </span>
            )}
          </div>
          {/* Confidence score */}
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
            c.confidence === 'high'
              ? 'bg-green-50 text-green-700 border-green-200'
              : c.confidence === 'medium'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-gray-100 text-gray-600 border-gray-200'
          }`}>
            {c.confidence} relevance
          </span>
        </div>

        {/* Publication title + link */}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {c.publication_title && (
            <p className="text-xs text-gray-600 italic leading-snug flex-1">
              {c.publication_title}
            </p>
          )}
          {c.publication_date && (
            <span className="text-[10px] text-gray-400 flex-shrink-0">
              {new Date(c.publication_date).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 py-3">
        {/* Summary */}
        <p className="text-sm text-gray-800 leading-relaxed mb-3">{c.summary}</p>

        {/* Key points */}
        {c.key_points && c.key_points.length > 0 && (
          <ul className="space-y-1 mb-3">
            {c.key_points.map((pt, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
                <span className="flex-shrink-0 text-brand-400 font-bold">›</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Verbatim excerpt (collapsible) */}
        {c.retrieved_excerpt && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setExcerptOpen((v) => !v)}
              className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
            >
              {excerptOpen ? '▲ Hide source excerpt' : '▼ Show source excerpt'}
            </button>
            {excerptOpen && (
              <blockquote className="mt-2 border-l-4 border-gray-300 pl-3 text-xs text-gray-600 leading-relaxed italic">
                {c.retrieved_excerpt}
              </blockquote>
            )}
          </div>
        )}
      </div>

      {/* ── Footer — verification mark + link ── */}
      <div className="px-4 py-2 bg-green-50 border-t border-green-100 flex items-center justify-between gap-3">
        <p className="text-[10px] text-green-700">
          <span className="font-bold">✓ Verified.</span> Retrieved from source URL. Content extracted from live page.
        </p>
        {c.source_url && (
          <a
            href={c.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-brand-600 hover:text-brand-800 font-medium hover:underline flex-shrink-0"
          >
            View source ↗
          </a>
        )}
      </div>
    </div>
  )
}

// (ExternalCommentary imported above with other types)

// ── LikelyArtefact row ──────────────────────────────────────────────────────

const ARTEFACT_TYPE_LABELS: Record<string, string> = {
  briefing_note: 'Briefing note',
  board_paper: 'Board paper',
  policy_update: 'Policy update',
  control_mapping: 'Control mapping',
  implementation_tracker: 'Implementation tracker',
  committee_paper: 'Committee paper',
  training_material: 'Training material',
  attestation: 'Attestation',
  gap_analysis: 'Gap analysis',
  legal_opinion: 'Legal opinion',
  regulatory_notification: 'Regulatory notification',
  other: 'Other',
}

function ArtefactRow({ artefact }: { artefact: LikelyArtefact }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="flex-shrink-0 mt-0.5 text-gray-300 text-sm">□</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 leading-relaxed">{artefact.artefact}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <PriorityBadge priority={artefact.priority} />
          <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600">
            {ARTEFACT_TYPE_LABELS[artefact.type] ?? artefact.type}
          </span>
          <AttributionBadge type={artefact.attribution} />
        </div>
      </div>
    </div>
  )
}

// ── BankScope operational view ──────────────────────────────────────────────

function BankScopeQuadrant({
  label,
  items,
  variant,
}: {
  label: string
  items: string[]
  variant: 'action' | 'escalate' | 'validate' | 'monitor'
}) {
  const styles = {
    action:   { bg: 'bg-green-50 border-green-200',  label: 'text-green-700',  icon: '▶' },
    escalate: { bg: 'bg-red-50 border-red-200',       label: 'text-red-700',    icon: '↑' },
    validate: { bg: 'bg-amber-50 border-amber-200',  label: 'text-amber-700',  icon: '✓' },
    monitor:  { bg: 'bg-blue-50 border-blue-200',    label: 'text-blue-700',   icon: '◎' },
  }
  const s = styles[variant]
  return (
    <div className={`border rounded-lg p-4 ${s.bg}`}>
      <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${s.label}`}>
        {s.icon} {label}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic">None identified</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-gray-800 leading-relaxed flex gap-2">
              <span className="flex-shrink-0 text-gray-400">›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Synthesis pill list ─────────────────────────────────────────────────────

function SynthesisList({ items, variant }: { items: string[]; variant: 'consensus' | 'uncertain' | 'actionable' | 'signoff' }) {
  const styles = {
    consensus:  { icon: '✓', itemClass: 'text-green-800',  bgClass: 'bg-green-50 border-green-100' },
    uncertain:  { icon: '?', itemClass: 'text-amber-800',  bgClass: 'bg-amber-50 border-amber-100' },
    actionable: { icon: '▶', itemClass: 'text-brand-800', bgClass: 'bg-brand-50 border-brand-100' },
    signoff:    { icon: '⚠', itemClass: 'text-red-700',   bgClass: 'bg-red-50 border-red-100' },
  }
  const s = styles[variant]
  if (!items || items.length === 0) return null
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 border text-sm leading-relaxed ${s.bgClass} ${s.itemClass}`}>
          <span className="flex-shrink-0 font-bold">{s.icon}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export interface RegulatoryFileViewProps {
  file: RegulatoryFile
  /**
   * Called when the user clicks "Find trusted commentary".
   * Wired from RegulatoryFileSection → POST /api/regulatory-files/[itemId]/commentary
   */
  onFindCommentary?: () => void
  /** True while the commentary POST is in flight */
  commentarySearching?: boolean
  /** Error message from a failed commentary POST — shown inline with a retry option */
  commentaryError?: string | null
  /** Clears commentaryError (e.g. on dismiss) */
  onClearCommentaryError?: () => void
}

export function RegulatoryFileView({
  file,
  onFindCommentary,
  commentarySearching = false,
  commentaryError = null,
  onClearCommentaryError,
}: RegulatoryFileViewProps) {
  let sn = 0

  return (
    <div className="space-y-3">

      {/* ── Dossier header ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-1">
              BANKSCOPE REGULATORY FILE
            </p>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{file.source_title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{file.source_organisation}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {file.urgency && (
              <span className={`badge badge-${file.urgency}`}>{file.urgency.charAt(0).toUpperCase() + file.urgency.slice(1)} priority</span>
            )}
            {file.action_required && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                file.action_required === 'yes' ? 'bg-red-50 border-red-200 text-red-700' :
                file.action_required === 'monitor' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-gray-50 border-gray-200 text-gray-600'
              }`}>
                {file.action_required === 'yes' ? '⚠ Action required' :
                 file.action_required === 'monitor' ? '👁 Monitor' : 'ℹ Awareness'}
              </span>
            )}
          </div>
        </div>

        {/* Attribution key — covers the three labels used in source analysis sections */}
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Attribution key</p>
          <div className="flex flex-wrap gap-3">
            {(['explicit', 'likely_implication', 'ai_interpretation'] as const).map((k) => (
              <AttributionBadge key={k} type={k} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 1: Source-grounded summary ── */}
      <Section number={++sn} title="Source-grounded summary">
        {file.source_summary && (
          <div className="space-y-4">
            {file.source_summary.what_changed && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">What changed</p>
                <p className="text-sm text-gray-800 leading-relaxed">{file.source_summary.what_changed}</p>
              </div>
            )}
            {file.source_summary.publication_purpose && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Publication purpose</p>
                <p className="text-sm text-gray-700 leading-relaxed">{file.source_summary.publication_purpose}</p>
              </div>
            )}

            {file.source_summary.explicitly_stated && file.source_summary.explicitly_stated.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Explicitly stated in source</p>
                <ul className="space-y-1.5">
                  {file.source_summary.explicitly_stated.map((stmt, i) => (
                    <li key={i} className="flex gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-sm text-green-900 leading-relaxed">
                      <span className="flex-shrink-0 font-semibold text-green-500">✓</span>
                      <span>{stmt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {file.source_summary.firms_most_affected && file.source_summary.firms_most_affected.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Firms most affected</p>
                  <div className="flex flex-wrap gap-1.5">
                    {file.source_summary.firms_most_affected.map((f) => (
                      <span key={f} className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs bg-blue-50 text-blue-800 border border-blue-200">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {file.source_summary.functions_most_affected && file.source_summary.functions_most_affected.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Functions most affected</p>
                  <div className="flex flex-wrap gap-1.5">
                    {file.source_summary.functions_most_affected.map((fn) => (
                      <span key={fn} className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs bg-purple-50 text-purple-700 border border-purple-100">{fn}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* ── Section 2: Operative points ── */}
      <Section number={++sn} title={`Key operative points (${file.operative_points?.length ?? 0})`}>
        {file.operative_points && file.operative_points.length > 0 ? (
          <div className="space-y-2">
            {file.operative_points.map((pt, i) => (
              <OperativePointCard key={i} point={pt} index={i} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic py-2">No operative points generated.</p>
        )}
      </Section>

      {/* ── Section 3: Action triggers ── */}
      <Section number={++sn} title={`Potential action triggers (${file.action_triggers?.length ?? 0})`}>
        {/* Priority filter hint */}
        <div className="flex flex-wrap gap-2 mb-3">
          {['high', 'medium', 'low'].map((p) => {
            const count = file.action_triggers?.filter((t) => t.priority === p).length ?? 0
            return count > 0 ? (
              <span key={p} className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_CFG[p as keyof typeof PRIORITY_CFG]}`}>
                {count} {p} priority
              </span>
            ) : null
          })}
        </div>
        {file.action_triggers && file.action_triggers.length > 0 ? (
          <div className="space-y-2">
            {[...file.action_triggers]
              .sort((a, b) => {
                const order = { high: 0, medium: 1, low: 2 }
                return (order[a.priority] ?? 1) - (order[b.priority] ?? 1)
              })
              .map((trigger, i) => (
                <ActionTriggerCard key={i} trigger={trigger} index={i} />
              ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic py-2">No action triggers identified.</p>
        )}
      </Section>

      {/* ── Section 4: Ambiguity areas ── */}
      <Section number={++sn} title={`Areas of ambiguity / interpretation (${file.ambiguity_areas?.length ?? 0})`}>
        {file.ambiguity_areas && file.ambiguity_areas.length > 0 ? (
          <div className="space-y-2">
            {file.ambiguity_areas.map((area, i) => (
              <AmbiguityAreaCard key={i} area={area} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic py-2">No significant ambiguity areas identified.</p>
        )}
      </Section>

      {/* ── Section 5: Synthesis ── */}
      <Section number={++sn} title="Synthesis — consensus and uncertainty">
        {file.synthesis ? (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Consensus points (can rely on)</p>
              <SynthesisList items={file.synthesis.consensus_points} variant="consensus" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Uncertain or contested points</p>
              <SynthesisList items={file.synthesis.uncertain_points} variant="uncertain" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Actionable now (no further clarity needed)</p>
              <SynthesisList items={file.synthesis.actionable_now} variant="actionable" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Needs sign-off before acting</p>
              <SynthesisList items={file.synthesis.needs_sign_off} variant="signoff" />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic py-2">Synthesis not available.</p>
        )}
      </Section>

      {/* ── Section 6: Ownership and governance ── */}
      <Section number={++sn} title="Ownership and governance implications" defaultOpen={false}>
        {file.ownership ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Accountable functions</p>
                <div className="flex flex-wrap gap-1.5">
                  {file.ownership.accountable_functions?.map((fn) => (
                    <span key={fn} className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs bg-purple-50 text-purple-700 border border-purple-100">{fn}</span>
                  ))}
                </div>
              </Card>
              <Card>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Likely business owners</p>
                <div className="flex flex-wrap gap-1.5">
                  {file.ownership.likely_business_owners?.map((owner) => (
                    <span key={owner} className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs bg-gray-100 text-gray-700 border border-gray-200">{owner}</span>
                  ))}
                </div>
              </Card>
            </div>

            <Card>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Governance forums</p>
              <div className="flex flex-wrap gap-1.5">
                {file.ownership.governance_forums?.map((gf) => (
                  <span key={gf} className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-100">{gf}</span>
                ))}
              </div>
            </Card>

            <div className="flex flex-wrap gap-3">
              <div className={`flex-1 min-w-48 border rounded-lg px-4 py-3 ${
                file.ownership.board_visibility_required
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-gray-500">Board visibility</p>
                <p className={`text-sm font-semibold ${file.ownership.board_visibility_required ? 'text-red-700' : 'text-gray-600'}`}>
                  {file.ownership.board_visibility_required ? '⚠ Required' : '✓ Not required'}
                </p>
                {file.ownership.board_visibility_rationale && (
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{file.ownership.board_visibility_rationale}</p>
                )}
              </div>

              <div className={`flex-1 min-w-48 border rounded-lg px-4 py-3 ${
                file.ownership.smcr_relevant
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-gray-500">SMCR relevance</p>
                <p className={`text-sm font-semibold ${file.ownership.smcr_relevant ? 'text-amber-700' : 'text-gray-600'}`}>
                  {file.ownership.smcr_relevant ? '⚠ SMCR relevant' : '✓ Not SMCR relevant'}
                </p>
                {file.ownership.smcr_note && (
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{file.ownership.smcr_note}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic py-2">Ownership analysis not available.</p>
        )}
      </Section>

      {/* ── Section 7: Likely artefacts ── */}
      <Section number={++sn} title={`Likely evidence artefacts (${file.likely_artefacts?.length ?? 0})`} defaultOpen={false}>
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
          These are the types of documents or evidence a firm may need to produce in connection with this publication.
          Use as a starting checklist — adapt based on your firm&apos;s specific obligations.
        </p>
        {file.likely_artefacts && file.likely_artefacts.length > 0 ? (
          <div className="border border-gray-200 rounded-lg bg-white divide-y divide-gray-100">
            {file.likely_artefacts.map((a, i) => (
              <div key={i} className="px-4">
                <ArtefactRow artefact={a} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic py-2">No artefacts identified.</p>
        )}
      </Section>

      {/* ── Section 8: BankScope operational view ── */}
      <Section number={++sn} title="BankScope operational view (AI-assisted)">
        {file.bankscope_view ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <BankScopeQuadrant
                label="Action now"
                items={file.bankscope_view.action_now ?? []}
                variant="action"
              />
              <BankScopeQuadrant
                label="Escalate immediately"
                items={file.bankscope_view.escalate ?? []}
                variant="escalate"
              />
              <BankScopeQuadrant
                label="Validate first"
                items={file.bankscope_view.validate_first ?? []}
                variant="validate"
              />
              <BankScopeQuadrant
                label="Monitor"
                items={file.bankscope_view.monitor ?? []}
                variant="monitor"
              />
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <span className="font-semibold">Disclaimer: </span>
              {file.bankscope_view.disclaimer}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic py-2">Operational view not available.</p>
        )}
      </Section>

      {/* ── Section 9: External commentary ── */}
      {(() => {
        // Safety filter: only show entries that are genuinely verified+fetched.
        // The pipeline should never write anything else, but this is the final guard.
        const verifiedCommentary = (file.external_commentary ?? []).filter(
          (c) => c.verified === true && c.attribution === 'fetched' && c.source_url
        )
        const hasCommentary = verifiedCommentary.length > 0

        // commentary_status drives which CTA / state we show in the empty state:
        //   not_searched   → never searched; Phase 1 may not have generated queries yet
        //   search_ready   → Phase 1 generated queries; user can now trigger Phase 2
        //   partial/complete → Phase 2 has run (results may still be empty = no strong match)
        const commentaryStatus = file.commentary_status
        const isSearchReady = commentaryStatus === 'search_ready'
        const hasSearchRun = commentaryStatus === 'partial' || commentaryStatus === 'complete'
        const commentaryEnrichedAt = file.commentary_enriched_at

        // CTA visibility: show "Find trusted commentary" when search is ready,
        // hasn't run yet, not currently searching, and the callback is wired.
        const showFindButton =
          isSearchReady &&
          !commentaryEnrichedAt &&
          !commentarySearching &&
          typeof onFindCommentary === 'function'

        // Show re-run button when search has already run but user wants a refresh
        const showRefreshButton =
          hasSearchRun &&
          !commentarySearching &&
          typeof onFindCommentary === 'function'

        return (
          <Section
            number={++sn}
            title={
              hasCommentary
                ? `External commentary (${verifiedCommentary.length} verified source${verifiedCommentary.length !== 1 ? 's' : ''})`
                : 'External commentary'
            }
            defaultOpen={hasCommentary}
          >
            {/* ── Error state (commentary POST failed) ── */}
            {commentaryError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 mb-4 flex items-start gap-3">
                <span className="text-red-400 text-xs flex-shrink-0 mt-0.5">✕</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-red-700 leading-relaxed">{commentaryError}</p>
                  <div className="flex gap-3 mt-2">
                    {typeof onFindCommentary === 'function' && (
                      <button
                        type="button"
                        onClick={onFindCommentary}
                        className="text-xs text-red-600 hover:text-red-800 font-medium underline underline-offset-2"
                      >
                        Try again
                      </button>
                    )}
                    {typeof onClearCommentaryError === 'function' && (
                      <button
                        type="button"
                        onClick={onClearCommentaryError}
                        className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Searching state ── */}
            {commentarySearching && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-4 mb-4 flex items-center gap-3">
                <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Searching trusted sources…</p>
                  <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
                    Querying Big 4, law firms, and industry bodies. This takes 30–60 seconds.
                    Only verified matches will be shown.
                  </p>
                </div>
              </div>
            )}

            {/* ── Commentary cards (search found results) ── */}
            {hasCommentary && !commentarySearching ? (
              <>
                {/* Trust notice */}
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 mb-4 flex items-start gap-2">
                  <span className="text-green-500 text-xs flex-shrink-0 mt-0.5">✓</span>
                  <p className="text-xs text-green-800 leading-relaxed">
                    All commentary below was retrieved from live source URLs and extracted from
                    real published content. Source, date, and link are shown for each entry.
                    {commentaryEnrichedAt && (
                      <span className="text-green-600 ml-1">
                        Last retrieved{' '}
                        {new Date(commentaryEnrichedAt).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}.
                      </span>
                    )}
                  </p>
                </div>

                <div className="space-y-3">
                  {verifiedCommentary.map((c, i) => (
                    <VerifiedCommentaryCard key={i} c={c} />
                  ))}
                </div>

                {/* Refresh option for completed searches */}
                {showRefreshButton && (
                  <div className="mt-3 text-right">
                    <button
                      type="button"
                      onClick={onFindCommentary}
                      className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
                    >
                      ↻ Re-run commentary search
                    </button>
                  </div>
                )}
              </>
            ) : !commentarySearching ? (
              /* ── Empty state — varies by how far through the pipeline we are ── */
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-6 text-center">
                {hasSearchRun ? (
                  /* Phase 2 ran but found nothing strong enough to show */
                  <>
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      No strong trusted-source commentary found
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-lg mx-auto mb-4">
                      Commentary search ran but no clearly relevant, verified results were found
                      from Big 4, law firms, or industry bodies for this publication.
                      Results are only included when relevance is strongly confirmed — no result is
                      better than a wrong result.
                    </p>
                    {showRefreshButton && (
                      <button
                        type="button"
                        onClick={onFindCommentary}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        ↻ Try again
                      </button>
                    )}
                    {commentaryEnrichedAt && (
                      <p className="text-[10px] text-gray-400 mt-3">
                        Last searched{' '}
                        {new Date(commentaryEnrichedAt).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    )}
                  </>
                ) : isSearchReady ? (
                  /* Phase 1 complete, queries generated, Phase 2 not yet triggered */
                  <>
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      Commentary not yet retrieved
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-lg mx-auto mb-4">
                      Search queries have been prepared from the regulatory publication details.
                      Click below to search for published analysis from Big 4, law firms, and
                      industry bodies. Only verified, source-attributed results will be shown.
                    </p>
                    {showFindButton && (
                      <button
                        type="button"
                        onClick={onFindCommentary}
                        disabled={commentarySearching}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        🔍 Find trusted commentary
                      </button>
                    )}
                    <p className="text-[10px] text-gray-400 mt-3">
                      Searches Big 4, law firms, regulators, and industry bodies · Takes 30–60 s
                    </p>
                  </>
                ) : (
                  /* commentary_status === 'not_searched' — Phase 1 hasn't generated queries yet */
                  <>
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      Commentary search not yet available
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-lg mx-auto">
                      Commentary search will become available once the regulatory file analysis
                      is complete and search queries have been generated.
                    </p>
                  </>
                )}
              </div>
            ) : null}

            {/* Research starting points — shown alongside or instead of automated results */}
            {!commentarySearching && file.commentary_search_queries && file.commentary_search_queries.length > 0 && (
              <div className="mt-4 border border-gray-200 rounded-lg bg-white p-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                  Research starting points
                </p>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                  Use these queries to manually find published commentary from reputable sources.
                </p>
                <ul className="space-y-2">
                  {file.commentary_search_queries.map((q, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-gray-300 flex-shrink-0 text-xs mt-0.5">🔍</span>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(q)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:text-brand-800 hover:underline leading-relaxed"
                      >
                        {q}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )
      })()}

      {/* ── Footer — enrichment metadata ── */}
      <div className="text-center text-[10px] text-gray-400 py-2">
        Enriched by {file.enrichment_model ?? 'AI'} ·{' '}
        {file.enriched_at
          ? new Date(file.enriched_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : 'date unknown'}
        {' '} · Commentary status: <span className="font-medium">{file.commentary_status}</span>
      </div>

    </div>
  )
}

// ── Loading / generating states ─────────────────────────────────────────────

export function RegulatoryFileLoading() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="border border-gray-200 rounded-xl p-5 bg-white animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
        </div>
      ))}
    </div>
  )
}

export function RegulatoryFileEmpty({
  itemId,
  onGenerate,
  generating,
}: {
  itemId: string
  onGenerate: () => void
  generating: boolean
}) {
  return (
    <div className="border border-dashed border-gray-300 rounded-xl p-8 bg-gray-50 text-center">
      <div className="text-3xl mb-3">📋</div>
      <h3 className="font-semibold text-gray-900 text-base mb-1">No regulatory file yet</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto leading-relaxed">
        Generate a full structured analysis of this item — including operative points, action triggers,
        ambiguity areas, governance implications, and BankScope operational guidance.
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {generating ? (
          <>
            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating dossier…
          </>
        ) : (
          <>📋 Generate regulatory file</>
        )}
      </button>
      <p className="text-[10px] text-gray-400 mt-3">
        Powered by GPT-4o · Takes approx. 20–40 seconds · No credits charged
      </p>
    </div>
  )
}

export function RegulatoryFileFailed({
  error,
  onRetry,
  retrying,
}: {
  error: string
  onRetry: () => void
  retrying: boolean
}) {
  return (
    <div className="border border-red-200 rounded-xl p-6 bg-red-50">
      <p className="text-sm font-semibold text-red-800 mb-1">Enrichment failed</p>
      <p className="text-xs text-red-600 mb-4 font-mono leading-relaxed">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
      >
        {retrying ? 'Retrying…' : '↻ Retry enrichment'}
      </button>
    </div>
  )
}
