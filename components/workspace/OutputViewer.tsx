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

// ── Shared sub-components ──────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{title}</h3>
      {children}
    </div>
  )
}

function StringList({ items, colour = 'gray' }: { items: string[]; colour?: 'gray' | 'blue' | 'red' | 'green' | 'purple' | 'amber' }) {
  const colourMap = {
    gray:   'bg-gray-50 border-gray-200 text-gray-700',
    blue:   'bg-blue-50 border-blue-200 text-blue-800',
    red:    'bg-red-50 border-red-200 text-red-800',
    green:  'bg-green-50 border-green-200 text-green-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    amber:  'bg-amber-50 border-amber-200 text-amber-800',
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className={`border rounded-lg px-4 py-2.5 text-sm leading-relaxed ${colourMap[colour]}`}>
          {item}
        </li>
      ))}
    </ul>
  )
}

function BodyText({ text }: { text: string }) {
  return <p className="text-gray-800 text-sm leading-relaxed">{text}</p>
}

function ConfidenceNote({ note }: { note: string }) {
  return (
    <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
      <span className="text-lg flex-shrink-0">🔍</span>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Confidence & source note</p>
        <p className="text-xs text-gray-600 leading-relaxed">{note}</p>
      </div>
    </div>
  )
}

// ── Output type renderers ──────────────────────────────────────────────────

function DeliveryBriefView({ content }: { content: DeliveryBriefContent }) {
  return (
    <div>
      <Section title="What changed">
        <BodyText text={content.what_changed} />
      </Section>
      <Section title="Why it matters">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <BodyText text={content.why_it_matters} />
        </div>
      </Section>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <Section title="Affected business areas">
          <div className="flex flex-wrap gap-1.5">
            {content.affected_areas.map((a) => (
              <span key={a} className="inline-flex items-center rounded-full px-3 py-1 text-xs bg-blue-50 text-blue-800 border border-blue-200 font-medium">{a}</span>
            ))}
          </div>
        </Section>
        <Section title="Suggested timeline">
          <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-brand-800">{content.suggested_timeline}</p>
          </div>
        </Section>
      </div>
      <Section title="Key risks">
        <StringList items={content.key_risks} colour="red" />
      </Section>
      <Section title="Recommended owners">
        <div className="space-y-3">
          {content.recommended_owners.map((o, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">{o.role}</p>
              <p className="text-sm text-gray-600">{o.responsibility}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Immediate actions (next 30 days)">
        <StringList items={content.immediate_actions} colour="blue" />
      </Section>
      <ConfidenceNote note={content.confidence_note} />
    </div>
  )
}

function CompliancePackView({ content }: { content: CompliancePackContent }) {
  return (
    <div>
      <Section title="Regulatory obligations">
        <StringList items={content.regulatory_obligations} colour="red" />
      </Section>
      <Section title="Policies impacted">
        <StringList items={content.policies_impacted} colour="amber" />
      </Section>
      <Section title="Controls to review">
        <StringList items={content.controls_to_review} colour="blue" />
      </Section>
      <Section title="Evidence required">
        <StringList items={content.evidence_required} colour="purple" />
      </Section>
      <Section title="Suggested attestations">
        <StringList items={content.suggested_attestations} colour="green" />
      </Section>
      <Section title="Monitoring actions">
        <StringList items={content.monitoring_actions} colour="gray" />
      </Section>
      <ConfidenceNote note={content.confidence_note} />
    </div>
  )
}

function GovernanceBriefView({ content }: { content: GovernanceBriefContent }) {
  return (
    <div>
      <Section title="Decision points">
        <StringList items={content.decision_points} colour="blue" />
      </Section>
      <Section title="Risk areas">
        <StringList items={content.risk_areas} colour="red" />
      </Section>
      <Section title="Dependencies">
        <StringList items={content.dependencies} colour="amber" />
      </Section>
      <Section title="Required governance forums">
        <div className="flex flex-wrap gap-2">
          {content.required_governance_forums.map((f) => (
            <span key={f} className="inline-flex items-center rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm text-purple-800 font-medium">{f}</span>
          ))}
        </div>
      </Section>
      <Section title="Escalation considerations">
        <StringList items={content.escalation_considerations} colour="purple" />
      </Section>
      <ConfidenceNote note={content.confidence_note} />
    </div>
  )
}

function BoardSummaryView({ content }: { content: BoardSummaryContent }) {
  return (
    <div>
      <Section title="Executive summary">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <BodyText text={content.executive_summary} />
        </div>
      </Section>
      <Section title="Strategic relevance">
        <BodyText text={content.strategic_relevance} />
      </Section>
      <Section title="Regulatory exposure">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <BodyText text={content.regulatory_exposure} />
        </div>
      </Section>
      <Section title="Key decisions required from the Board">
        <StringList items={content.key_decisions_required} colour="blue" />
      </Section>
      <Section title="Board questions to ask management">
        <div className="space-y-2">
          {content.board_questions.map((q, i) => (
            <div key={i} className="flex gap-3 border border-gray-200 rounded-xl p-4">
              <span className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-800 rounded-full text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <p className="text-sm text-gray-800">{q}</p>
            </div>
          ))}
        </div>
      </Section>
      <ConfidenceNote note={content.confidence_note} />
    </div>
  )
}

function ImplementationPlanView({ content }: { content: ImplementationPlanContent }) {
  return (
    <div>
      <Section title="Workstreams">
        <div className="space-y-3">
          {content.workstreams.map((w, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-gray-900">{w.name}</p>
                <span className="flex-shrink-0 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 border border-gray-200">{w.owner_role}</span>
              </div>
              <p className="text-sm text-gray-600">{w.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Milestones">
        <div className="space-y-2">
          {content.milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-3 border border-blue-100 bg-blue-50 rounded-xl px-4 py-3">
              <div className="flex-shrink-0 text-xs font-medium text-blue-600 w-20">{m.timeframe}</div>
              <div className="flex-1 text-sm text-blue-900">{m.milestone}</div>
              <span className="flex-shrink-0 text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{m.phase}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="30 / 60 / 90 day plan">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Days 0–30', items: content.delivery_phases.days_0_30, colour: 'border-green-200 bg-green-50' },
            { label: 'Days 31–60', items: content.delivery_phases.days_31_60, colour: 'border-blue-200 bg-blue-50' },
            { label: 'Days 61–90', items: content.delivery_phases.days_61_90, colour: 'border-purple-200 bg-purple-50' },
          ].map(({ label, items, colour }) => (
            <div key={label} className={`border rounded-xl p-4 ${colour}`}>
              <p className="text-xs font-bold text-gray-700 uppercase mb-3">{label}</p>
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li key={i} className="text-xs text-gray-700 flex gap-2">
                    <span className="flex-shrink-0 font-bold">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="RAID log (starter)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: '⚠️ Risks', items: content.raid.risks, colour: 'border-red-200 bg-red-50' },
            { label: '✅ Assumptions', items: content.raid.assumptions, colour: 'border-green-200 bg-green-50' },
            { label: '🔴 Issues', items: content.raid.issues, colour: 'border-orange-200 bg-orange-50' },
            { label: '🔗 Dependencies', items: content.raid.dependencies, colour: 'border-blue-200 bg-blue-50' },
          ].map(({ label, items, colour }) => (
            <div key={label} className={`border rounded-xl p-4 ${colour}`}>
              <p className="text-xs font-bold text-gray-700 mb-2">{label}</p>
              <ul className="space-y-1.5">
                {items.map((item, i) => (
                  <li key={i} className="text-xs text-gray-700">· {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <ConfidenceNote note={content.confidence_note} />
    </div>
  )
}

// ── Main OutputViewer ──────────────────────────────────────────────────────

interface OutputViewerProps {
  output: GeneratedOutput
}

export function OutputViewer({ output }: OutputViewerProps) {
  const generatedAt = format(parseISO(output.created_at), 'd MMM yyyy, HH:mm')

  const TYPE_ICONS: Record<OutputType, string> = {
    delivery_brief: '📋',
    compliance_pack: '⚖️',
    governance_brief: '🏛️',
    board_summary: '👔',
    implementation_plan: '🗺️',
  }

  return (
    <div>
      {/* Output header */}
      <div className="mb-6 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{TYPE_ICONS[output.output_type]}</span>
          <span className="badge bg-brand-100 text-brand-800 text-xs font-semibold uppercase tracking-wide">
            {OUTPUT_TYPE_LABELS[output.output_type]}
          </span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight mb-3">{output.title}</h1>

        {/* Source attribution */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>Generated {generatedAt}</span>
          {output.source_name && <span>Source: {output.source_name}</span>}
          {output.source_item_url && (
            <a
              href={output.source_item_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:text-brand-800 font-medium transition-colors"
            >
              View original source ↗
            </a>
          )}
        </div>

        {/* Source fact transparency banner */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
          <span className="font-semibold">📌 Source transparency: </span>
          This deliverable was generated from{' '}
          {output.source_item_url ? (
            <a href={output.source_item_url} target="_blank" rel="noopener noreferrer" className="underline">
              {output.source_item_title ?? 'the source publication'}
            </a>
          ) : (
            output.source_item_title ?? 'the source publication'
          )}
          . Factual statements reflect the source document; recommended actions, owners, and timelines are AI-suggested and should be validated with your compliance team.
        </div>
      </div>

      {/* Type-specific content */}
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
    </div>
  )
}
