'use client'

import type { ReactNode } from 'react'
import type {
  GeneratedOutput,
  OutputType,
  DeliveryBriefContent,
  CompliancePackContent,
  GovernanceBriefContent,
  BoardSummaryContent,
  ImplementationPlanContent,
} from '@/lib/types'
import { OUTPUT_TYPE_LABELS } from '@/lib/types'
import { format, parseISO } from 'date-fns'

// ── Design tokens ──────────────────────────────────────────────────────────
// Keep these minimal — the document preview intentionally uses a muted,
// print-ready palette rather than the dashboard's vivid UI colours.

const DOC_TYPE_META: Record<OutputType, { icon: string; audience: string }> = {
  delivery_brief:       { icon: '📋', audience: 'Compliance · Risk · Business Leads' },
  compliance_pack:      { icon: '⚖️', audience: 'Compliance Function · First Line Risk' },
  governance_brief:     { icon: '🏛️', audience: 'CRO · Company Secretary · Risk Committee' },
  board_summary:        { icon: '👔', audience: 'Board of Directors · NED Members' },
  implementation_plan:  { icon: '🗺️', audience: 'PMO · Change Management · Workstream Leads' },
}

// ── Shared document primitives ─────────────────────────────────────────────

/** Top-level section with a rule and bold heading */
function DocSection({ number, title, children }: { number?: number; title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline gap-3 mb-4 pb-2 border-b-2 border-blue-100">
        {number !== undefined && (
          <span className="text-xs font-bold text-blue-600 tabular-nums w-5 flex-shrink-0">{number}.</span>
        )}
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </section>
  )
}

/** Sub-section without rule */
function DocSubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{title}</h3>
      {children}
    </div>
  )
}

/** Body text — clean, readable, document weight */
function DocPara({ children, italic = false }: { children: ReactNode; italic?: boolean }) {
  return (
    <p className={`text-[0.9rem] leading-7 text-gray-800 ${italic ? 'italic text-gray-500' : ''}`}>
      {children}
    </p>
  )
}

/** Callout/highlight box */
function Callout({
  label,
  children,
  variant = 'blue',
}: {
  label?: string
  children: ReactNode
  variant?: 'blue' | 'amber' | 'red' | 'green' | 'gray'
}) {
  const styles = {
    blue:  'bg-blue-50  border-l-4 border-blue-500  text-blue-900',
    amber: 'bg-amber-50 border-l-4 border-amber-500 text-amber-900',
    red:   'bg-red-50   border-l-4 border-red-500   text-red-900',
    green: 'bg-green-50 border-l-4 border-green-500 text-green-900',
    gray:  'bg-gray-50  border-l-4 border-gray-400  text-gray-800',
  }
  return (
    <div className={`rounded-r-lg px-5 py-4 mb-3 ${styles[variant]}`}>
      {label && <p className="text-xs font-bold uppercase tracking-wide opacity-70 mb-1">{label}</p>}
      <div className="text-[0.875rem] leading-6">{children}</div>
    </div>
  )
}

/** Unordered list item */
function ListItem({ children, variant = 'default' }: {
  children: ReactNode
  variant?: 'default' | 'action' | 'risk' | 'check'
}) {
  const icons = {
    default: <span className="text-gray-400 select-none mt-1">›</span>,
    action:  <span className="text-blue-500 select-none mt-1 font-bold">→</span>,
    risk:    <span className="text-red-500 select-none mt-1">⚠</span>,
    check:   <span className="text-green-500 select-none mt-1">✓</span>,
  }
  return (
    <li className="flex gap-3 py-2 border-b border-gray-100 last:border-b-0">
      <span className="flex-shrink-0 text-sm leading-6">{icons[variant]}</span>
      <span className="text-[0.875rem] leading-6 text-gray-800">{children}</span>
    </li>
  )
}

function DocList({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">{children}</ul>
}

/** Numbered list item */
function NumberedItem({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex gap-4 py-3 border-b border-gray-100 last:border-b-0">
      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <p className="text-[0.875rem] leading-6 text-gray-800 flex-1">{children}</p>
    </div>
  )
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden px-4">
      {items.map((item, i) => (
        <NumberedItem key={i} n={i + 1}>{item}</NumberedItem>
      ))}
    </div>
  )
}

/** Key-value table row */
function KVRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-4 py-3 border-b border-gray-100 last:border-b-0 items-start">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-0.5">{label}</span>
      <span className="text-[0.875rem] text-gray-800 leading-6">{value}</span>
    </div>
  )
}

function KVTable({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-gray-200 px-4 divide-y divide-gray-100">{children}</div>
}

// ── Output type renderers ──────────────────────────────────────────────────

function DeliveryBriefView({ content }: { content: DeliveryBriefContent }) {
  let sn = 1
  return (
    <div>
      {content.document_purpose && (
        <Callout label="Document purpose" variant="blue">
          {content.document_purpose}
        </Callout>
      )}

      {content.executive_summary && (
        <DocSection number={sn++} title="Executive Summary">
          <Callout variant="gray">{content.executive_summary}</Callout>
        </DocSection>
      )}

      <DocSection number={sn++} title="What Changed">
        <DocPara>{content.what_changed}</DocPara>
        {content.source_grounded_facts && content.source_grounded_facts.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Facts drawn directly from source</p>
            <DocList>
              {content.source_grounded_facts.map((f, i) => (
                <ListItem key={i} variant="check">{f}</ListItem>
              ))}
            </DocList>
          </div>
        )}
      </DocSection>

      <DocSection number={sn++} title="Why It Matters">
        <Callout variant="amber">{content.why_it_matters}</Callout>
      </DocSection>

      <DocSection number={sn++} title="Affected Business Areas">
        <div className="flex flex-wrap gap-2">
          {content.affected_areas.map((a) => (
            <span key={a} className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
              {a}
            </span>
          ))}
        </div>
      </DocSection>

      <DocSection number={sn++} title="Key Risks">
        <DocList>
          {(content.key_risks as Array<string | { risk: string; likelihood?: string; impact?: string }>).map((r, i) => {
            if (typeof r === 'string') return <ListItem key={i} variant="risk">{r}</ListItem>
            return (
              <ListItem key={i} variant="risk">
                <span>{r.risk}</span>
                {(r.likelihood || r.impact) && (
                  <span className="ml-2 text-xs text-gray-500">
                    {r.likelihood && `Likelihood: ${r.likelihood}`}{r.likelihood && r.impact && '  ·  '}{r.impact && `Impact: ${r.impact}`}
                  </span>
                )}
              </ListItem>
            )
          })}
        </DocList>
      </DocSection>

      <DocSection number={sn++} title="Recommended Owners">
        <KVTable>
          {(content.recommended_owners as Array<{ role: string; responsibility: string; timeframe?: string }>).map((o, i) => (
            <KVRow key={i} label={o.role} value={
              <span>{o.responsibility}{o.timeframe && <span className="ml-2 text-xs text-gray-400">By: {o.timeframe}</span>}</span>
            } />
          ))}
        </KVTable>
      </DocSection>

      <DocSection number={sn++} title="Immediate Actions (AI-Recommended)">
        <p className="text-xs text-gray-400 italic mb-3">The following actions are AI-suggested and should be validated with your compliance team before execution.</p>
        <NumberedList items={content.immediate_actions} />
      </DocSection>

      <DocSection number={sn++} title="Suggested Timeline">
        <Callout variant="green" label="Implementation window">{content.suggested_timeline}</Callout>
      </DocSection>
    </div>
  )
}

function CompliancePackView({ content }: { content: CompliancePackContent }) {
  let sn = 1
  return (
    <div>
      {content.document_purpose && (
        <Callout label="Document purpose" variant="blue">{content.document_purpose}</Callout>
      )}

      {content.compliance_deadline && (
        <Callout label="Compliance deadline" variant="red">{content.compliance_deadline}</Callout>
      )}

      <DocSection number={sn++} title="Regulatory Obligations">
        <DocList>
          {content.regulatory_obligations.map((o, i) => <ListItem key={i} variant="risk">{o}</ListItem>)}
        </DocList>
      </DocSection>

      <DocSection number={sn++} title="Policies Requiring Review">
        <DocList>
          {content.policies_impacted.map((p, i) => <ListItem key={i} variant="default">{p}</ListItem>)}
        </DocList>
      </DocSection>

      <DocSection number={sn++} title="Controls to Review">
        <DocList>
          {content.controls_to_review.map((c, i) => <ListItem key={i} variant="default">{c}</ListItem>)}
        </DocList>
      </DocSection>

      <DocSection number={sn++} title="Evidence Required">
        <p className="text-xs text-gray-400 italic mb-3">The firm should produce the following evidence to demonstrate compliance.</p>
        <NumberedList items={content.evidence_required} />
      </DocSection>

      <DocSection number={sn++} title="Suggested Attestations">
        <DocList>
          {content.suggested_attestations.map((a, i) => <ListItem key={i} variant="check">{a}</ListItem>)}
        </DocList>
      </DocSection>

      <DocSection number={sn++} title="Ongoing Monitoring Actions">
        <DocList>
          {content.monitoring_actions.map((m, i) => <ListItem key={i} variant="action">{m}</ListItem>)}
        </DocList>
      </DocSection>
    </div>
  )
}

function GovernanceBriefView({ content }: { content: GovernanceBriefContent }) {
  let sn = 1
  return (
    <div>
      {content.document_purpose && (
        <Callout label="Document purpose" variant="blue">{content.document_purpose}</Callout>
      )}

      {content.executive_summary && (
        <DocSection number={sn++} title="Executive Summary">
          <Callout variant="gray">{content.executive_summary}</Callout>
        </DocSection>
      )}

      <DocSection number={sn++} title="Decision Points">
        <p className="text-xs text-gray-400 italic mb-3">The following decisions require action from the governance forums listed.</p>
        <div className="space-y-3">
          {(content.decision_points as Array<string | { decision: string; forum?: string; urgency?: string }>).map((dp, i) => {
            if (typeof dp === 'string') return <NumberedItem key={i} n={i + 1}>{dp}</NumberedItem>
            return (
              <div key={i} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-[0.875rem] text-gray-800 leading-6">{dp.decision}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                      {dp.forum && <span className="bg-blue-50 text-blue-700 rounded px-2 py-0.5 font-medium">Forum: {dp.forum}</span>}
                      {dp.urgency && <span className="bg-amber-50 text-amber-700 rounded px-2 py-0.5 font-medium">Urgency: {dp.urgency}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </DocSection>

      <DocSection number={sn++} title="Required Governance Forums">
        <DocList>
          {content.required_governance_forums.map((f, i) => <ListItem key={i} variant="default">{f}</ListItem>)}
        </DocList>
      </DocSection>

      <DocSection number={sn++} title="Governance Risk Areas">
        <DocList>
          {content.risk_areas.map((r, i) => <ListItem key={i} variant="risk">{r}</ListItem>)}
        </DocList>
      </DocSection>

      <DocSection number={sn++} title="Dependencies">
        <DocList>
          {content.dependencies.map((d, i) => <ListItem key={i} variant="default">{d}</ListItem>)}
        </DocList>
      </DocSection>

      <DocSection number={sn++} title="Escalation Considerations">
        <DocList>
          {content.escalation_considerations.map((e, i) => <ListItem key={i} variant="risk">{e}</ListItem>)}
        </DocList>
      </DocSection>

      {content.reporting_cadence && (
        <DocSection number={sn++} title="Reporting Cadence">
          <Callout variant="blue" label="Suggested reporting structure">{content.reporting_cadence}</Callout>
        </DocSection>
      )}
    </div>
  )
}

function BoardSummaryView({ content }: { content: BoardSummaryContent }) {
  let sn = 1
  return (
    <div>
      {content.document_purpose && (
        <Callout label="Document purpose" variant="blue">{content.document_purpose}</Callout>
      )}

      <DocSection number={sn++} title="Executive Summary">
        <Callout variant="gray">
          <p className="text-[0.9375rem] leading-7 font-[450]">{content.executive_summary}</p>
        </Callout>
      </DocSection>

      <DocSection number={sn++} title="Strategic Relevance">
        <DocPara>{content.strategic_relevance}</DocPara>
      </DocSection>

      <DocSection number={sn++} title="Regulatory Exposure">
        <Callout variant="red" label="Consequence of non-compliance">
          {content.regulatory_exposure}
        </Callout>
      </DocSection>

      {content.management_response && (
        <DocSection number={sn++} title="Management Response">
          <Callout variant="green" label="What management is doing">
            {content.management_response}
          </Callout>
        </DocSection>
      )}

      <DocSection number={sn++} title="Key Decisions Required">
        <p className="text-xs text-gray-400 italic mb-3">The Board is asked to consider the following.</p>
        <NumberedList items={content.key_decisions_required} />
      </DocSection>

      <DocSection number={sn++} title="Suggested Board Questions">
        <p className="text-xs text-gray-400 italic mb-3">Questions a diligent director should ask of management.</p>
        <div className="space-y-3">
          {content.board_questions.map((q, i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-gray-200 text-gray-600 rounded-full text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <p className="text-[0.875rem] leading-6 text-gray-800 italic">{q}</p>
            </div>
          ))}
        </div>
      </DocSection>
    </div>
  )
}

function ImplementationPlanView({ content }: { content: ImplementationPlanContent }) {
  let sn = 1
  return (
    <div>
      {content.document_purpose && (
        <Callout label="Document purpose" variant="blue">{content.document_purpose}</Callout>
      )}

      {content.programme_overview && (
        <DocSection number={sn++} title="Programme Overview">
          <DocPara>{content.programme_overview}</DocPara>
        </DocSection>
      )}

      <DocSection number={sn++} title="Workstreams">
        <div className="space-y-4">
          {content.workstreams.map((w, i) => (
            <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">{w.name}</h4>
                <span className="text-xs bg-white border border-gray-200 rounded-full px-3 py-0.5 text-gray-600">{w.owner_role}</span>
              </div>
              <div className="px-4 py-3">
                <p className="text-[0.875rem] text-gray-700 leading-6 mb-3">{w.description}</p>
                {w.key_deliverables && w.key_deliverables.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Key deliverables</p>
                    <ul className="space-y-1">
                      {w.key_deliverables.map((d, j) => (
                        <li key={j} className="text-xs text-gray-700 flex gap-2">
                          <span className="text-blue-400 flex-shrink-0 font-bold">›</span>{d}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection number={sn++} title="Milestones">
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-[0.8125rem]">
            <thead>
              <tr className="bg-blue-700 text-white">
                {['Milestone', 'Timeframe', 'Phase', 'Owner'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {content.milestones.map((m, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 text-gray-800 leading-5">{m.milestone}</td>
                  <td className="px-4 py-2.5 font-semibold text-blue-700 whitespace-nowrap">{m.timeframe}</td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{m.phase}</td>
                  <td className="px-4 py-2.5 text-gray-600">{m.owner ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>

      <DocSection number={sn++} title="30 / 60 / 90 Day Plan">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Days 0–30', sub: 'Mobilisation', items: content.delivery_phases.days_0_30, border: 'border-green-200', bg: 'bg-green-50', dot: 'bg-green-400' },
            { label: 'Days 31–60', sub: 'Assessment & Delivery', items: content.delivery_phases.days_31_60, border: 'border-blue-200', bg: 'bg-blue-50', dot: 'bg-blue-400' },
            { label: 'Days 61–90', sub: 'Embedding & Closure', items: content.delivery_phases.days_61_90, border: 'border-purple-200', bg: 'bg-purple-50', dot: 'bg-purple-400' },
          ].map(({ label, sub, items, border, bg, dot }) => (
            <div key={label} className={`border ${border} ${bg} rounded-lg p-4`}>
              <p className="text-xs font-bold text-gray-700 uppercase">{label}</p>
              <p className="text-xs text-gray-400 mb-3">{sub}</p>
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li key={i} className="flex gap-2 text-xs text-gray-700 leading-5">
                    <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${dot} mt-1.5`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection number={sn++} title="RAID Log">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-bold text-red-700 uppercase mb-3">⚠ Risks</p>
            <ul className="space-y-3">
              {(content.raid.risks as Array<string | { description: string; mitigation?: string }>).map((r, i) => (
                <li key={i} className="text-xs text-gray-800 leading-5">
                  {typeof r === 'string' ? r : (
                    <>
                      <p>{r.description}</p>
                      {r.mitigation && <p className="text-green-700 mt-1">→ {r.mitigation}</p>}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-bold text-green-700 uppercase mb-3">✓ Assumptions</p>
            <ul className="space-y-2">
              {content.raid.assumptions.map((a, i) => <li key={i} className="text-xs text-gray-800 leading-5">{a}</li>)}
            </ul>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <p className="text-xs font-bold text-orange-700 uppercase mb-3">⚡ Issues</p>
            <ul className="space-y-2">
              {content.raid.issues.map((issue, i) => <li key={i} className="text-xs text-gray-800 leading-5">{issue}</li>)}
            </ul>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-bold text-blue-700 uppercase mb-3">🔗 Dependencies</p>
            <ul className="space-y-2">
              {content.raid.dependencies.map((d, i) => <li key={i} className="text-xs text-gray-800 leading-5">{d}</li>)}
            </ul>
          </div>
        </div>
      </DocSection>

      {content.governance_and_reporting && (
        <DocSection number={sn++} title="Governance & Reporting">
          <Callout variant="blue" label="Suggested governance structure">{content.governance_and_reporting}</Callout>
        </DocSection>
      )}

      {content.success_criteria && content.success_criteria.length > 0 && (
        <DocSection number={sn++} title="Success Criteria">
          <DocList>
            {content.success_criteria.map((s, i) => <ListItem key={i} variant="check">{s}</ListItem>)}
          </DocList>
        </DocSection>
      )}
    </div>
  )
}

// ── Main OutputViewer ──────────────────────────────────────────────────────

interface OutputViewerProps {
  output: GeneratedOutput
}

export function OutputViewer({ output }: OutputViewerProps) {
  const generatedAt = format(parseISO(output.created_at), 'd MMMM yyyy, HH:mm')
  const meta = DOC_TYPE_META[output.output_type]
  const typeLabel = OUTPUT_TYPE_LABELS[output.output_type]

  return (
    <div className="font-[system-ui,_-apple-system,_sans-serif]">

      {/* ── Document cover section ─────────────────────────────────────── */}
      <div className="mb-8 pb-8 border-b border-gray-200">
        {/* Organisation mark */}
        <p className="text-[0.6875rem] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3">
          BankScope Intelligence
        </p>

        {/* Document type badge + icon */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl" aria-hidden>{meta.icon}</span>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-1 uppercase tracking-wide">
            {typeLabel}
          </span>
        </div>

        {/* Title — the intelligence item title, not the output label */}
        <h1 className="text-xl font-bold text-gray-900 leading-snug mb-4 max-w-3xl">
          {output.source_item_title ?? output.title}
        </h1>

        {/* Document metadata table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-[0.8125rem] mb-5">
          <div className="flex gap-2">
            <span className="text-gray-400 w-28 flex-shrink-0">Generated</span>
            <span className="text-gray-700">{generatedAt}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-28 flex-shrink-0">Audience</span>
            <span className="text-gray-700">{meta.audience}</span>
          </div>
          {output.source_name && (
            <div className="flex gap-2">
              <span className="text-gray-400 w-28 flex-shrink-0">Source org</span>
              <span className="text-gray-700">{output.source_name}</span>
            </div>
          )}
          {output.source_item_url && (
            <div className="flex gap-2">
              <span className="text-gray-400 w-28 flex-shrink-0">Source link</span>
              <a
                href={output.source_item_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline underline-offset-2 truncate max-w-xs"
              >
                View original ↗
              </a>
            </div>
          )}
        </div>

        {/* Source transparency notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-[0.8125rem] text-amber-900">
          <span className="font-semibold">⚠ AI-Assisted Document — </span>
          Factual statements are drawn from{' '}
          {output.source_item_url ? (
            <a href={output.source_item_url} target="_blank" rel="noopener noreferrer" className="underline font-medium">
              the source publication
            </a>
          ) : 'the source publication'}
          . Recommended actions, suggested owners, and timelines are AI-assisted and must be validated with your compliance team before use. Not legal or regulatory advice.
        </div>
      </div>

      {/* ── Type-specific content ─────────────────────────────────────── */}
      {output.output_type === 'delivery_brief' && (
        <DeliveryBriefView content={output.content as DeliveryBriefContent} />
      )}
      {output.output_type === 'compliance_pack' && (
        <CompliancePackView content={output.content as CompliancePackContent} />
      )}
      {output.output_type === 'governance_brief' && (
        <GovernanceBriefView content={output.content as GovernanceBriefContent} />
      )}
      {output.output_type === 'board_summary' && (
        <BoardSummaryView content={output.content as BoardSummaryContent} />
      )}
      {output.output_type === 'implementation_plan' && (
        <ImplementationPlanView content={output.content as ImplementationPlanContent} />
      )}

      {/* ── Confidence & source footer ────────────────────────────────── */}
      {typeof ((output.content as unknown as Record<string, unknown>).confidence_note) === 'string' && (
        <div className="mt-10 pt-8 border-t border-gray-200">
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">🔍 Confidence & Source Note</p>
            <p className="text-[0.8125rem] text-gray-600 leading-6 italic">
              {((output.content as unknown as Record<string, unknown>).confidence_note) as string}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

