import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Badge, UrgencyDot } from '@/components/ui/Badge'
import { getIntelligenceItemById } from '@/lib/db/intelligence'
import { ActionButtons } from '@/components/dashboard/ActionButtons'
import { RegulatoryFileSection } from '@/components/dashboard/RegulatoryFileSection'
import type { Metadata } from 'next'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getIntelligenceItemById(params.id)
  if (!item) return { title: 'Item not found' }
  return {
    title: item.title,
    description: item.ai_summary ?? item.raw_excerpt ?? undefined,
  }
}

function toLabel(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Action required display config
const ACTION_CONFIG: Record<string, { label: string; description: string; classes: string; icon: string }> = {
  yes:       { label: 'Action Required',   description: 'This item requires a specific compliance or operational response.',   classes: 'bg-red-50 border-red-200 text-red-900',   icon: '⚠️' },
  monitor:   { label: 'Monitor',           description: 'Keep watching this development — action may be needed as it evolves.', classes: 'bg-amber-50 border-amber-200 text-amber-900', icon: '👁️' },
  awareness: { label: 'Awareness Only',    description: 'No immediate action needed, but teams should be aware.',               classes: 'bg-gray-50 border-gray-200 text-gray-700',  icon: 'ℹ️' },
}

// Urgency colour map for the rationale section
const URGENCY_BORDER: Record<string, string> = {
  critical: 'border-red-300 bg-red-50',
  high:     'border-orange-300 bg-orange-50',
  medium:   'border-yellow-200 bg-yellow-50',
  low:      'border-gray-200 bg-gray-50',
}

export default async function ItemDetailPage({ params }: Props) {
  const item = await getIntelligenceItemById(params.id)
  if (!item) notFound()

  const publishDate = item.publish_date
    ? format(parseISO(item.publish_date), 'EEEE d MMMM yyyy')
    : null

  const actionConfig = item.action_required ? ACTION_CONFIG[item.action_required] : null
  const urgencyBorderClass = item.urgency ? (URGENCY_BORDER[item.urgency] ?? URGENCY_BORDER.low) : URGENCY_BORDER.low

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          ← Back to dashboard
        </Link>

        <article className="card p-6 md:p-8">

          {/* ── Header badges ── */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="source">{item.source_name}</Badge>
            <Badge variant="content">{toLabel(item.content_type)}</Badge>
            {item.urgency && (
              <span className={`badge badge-${item.urgency} flex items-center gap-1.5`}>
                <UrgencyDot urgency={item.urgency} />
                {toLabel(item.urgency)} priority
              </span>
            )}
            {actionConfig && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${actionConfig.classes}`}>
                {actionConfig.icon} {actionConfig.label}
              </span>
            )}
            {item.priority_score != null && (
              <span className="badge bg-brand-100 text-brand-800">
                Score: {item.priority_score}/10
              </span>
            )}
            <span className={`badge ${
              item.confidence_status === 'reviewed'
                ? 'bg-green-100 text-green-800'
                : item.confidence_status === 'ai-generated'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600'
            }`}>
              {item.confidence_status === 'ai-generated' ? 'AI summarised' : item.confidence_status === 'reviewed' ? 'Reviewed' : 'Pending AI'}
            </span>
          </div>

          {/* ── Title ── */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{item.title}</h1>

          {/* ── Meta row ── */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-100">
            {publishDate && <span>{publishDate}</span>}
            {item.deadline && (
              <span className="font-medium text-red-600">
                Deadline: {format(parseISO(item.deadline), 'd MMMM yyyy')}
              </span>
            )}
            {item.source_url && (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-800 font-medium transition-colors"
              >
                View original source ↗
              </a>
            )}
          </div>

          {/* ── Why it matters — top-of-fold highlight ── */}
          {item.why_it_matters && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-2">Why it matters</h2>
              <p className="text-amber-900 text-sm leading-relaxed font-medium">{item.why_it_matters}</p>
            </div>
          )}

          {/* ── Action required callout ── */}
          {actionConfig && (
            <div className={`border rounded-xl p-4 mb-6 ${actionConfig.classes}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{actionConfig.icon}</span>
                <h2 className="text-xs font-semibold uppercase tracking-widest">{actionConfig.label}</h2>
              </div>
              <p className="text-xs leading-relaxed">{actionConfig.description}</p>
            </div>
          )}

          {/* ── Suggested next step ── */}
          {item.suggested_next_step && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-6">
              <h2 className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-2">Suggested next step</h2>
              <p className="text-brand-900 text-sm leading-relaxed">{item.suggested_next_step}</p>
            </div>
          )}

          {/* ── Generate a deliverable ── */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6">
            <ActionButtons itemId={item.id} itemTitle={item.title} variant="full" />
          </div>

          {/* ── AI Summary ── */}
          {item.ai_summary && (
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Summary</h2>
              <p className="text-gray-800 leading-relaxed text-base">{item.ai_summary}</p>
            </section>
          )}

          {/* ── Urgency rationale ── */}
          {(item.urgency || item.priority_rationale) && (
            <div className={`border rounded-xl p-4 mb-6 ${urgencyBorderClass}`}>
              <div className="flex items-center gap-2 mb-2">
                {item.urgency && (
                  <span className={`badge badge-${item.urgency} flex items-center gap-1.5`}>
                    <UrgencyDot urgency={item.urgency} />
                    {toLabel(item.urgency)} priority
                  </span>
                )}
                {item.priority_score != null && (
                  <span className="text-xs text-gray-500">Score {item.priority_score}/10</span>
                )}
              </div>
              {item.priority_rationale && (
                <p className="text-sm text-gray-700 leading-relaxed">{item.priority_rationale}</p>
              )}
            </div>
          )}

          {/* ── Three-column meta grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">

            {/* Affected firm types */}
            {item.affected_audience.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Affected firm types</h2>
                <div className="flex flex-wrap gap-1.5">
                  {item.affected_audience.map((a) => (
                    <span key={a} className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs bg-blue-50 text-blue-800 border border-blue-200">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Affected internal functions */}
            {item.affected_functions && item.affected_functions.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Internal functions</h2>
                <div className="flex flex-wrap gap-1.5">
                  {item.affected_functions.map((fn) => (
                    <span key={fn} className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs bg-purple-50 text-purple-700 border border-purple-100">
                      {toLabel(fn)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Topic tags */}
            {item.category_tags.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Topic tags</h2>
                <div className="flex flex-wrap gap-1.5">
                  {item.category_tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-gray-100 text-gray-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Regulatory theme + deadline ── */}
          {(item.regulatory_theme || item.deadline) && (
            <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              {item.regulatory_theme && (
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mr-2">Theme</span>
                  <span className="badge bg-gray-100 text-gray-600">{toLabel(item.regulatory_theme)}</span>
                </div>
              )}
              {item.deadline && (
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mr-2">Compliance deadline</span>
                  <span className="badge bg-red-100 text-red-700">{format(parseISO(item.deadline), 'd MMM yyyy')}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Raw excerpt ── */}
          {item.raw_excerpt && (
            <section className="border-t border-gray-100 pt-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Raw excerpt (from source)</h2>
              <p className="text-gray-500 text-sm leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-200">
                {item.raw_excerpt}
              </p>
            </section>
          )}
        </article>

        {/* ── Regulatory File Dossier ── */}
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">Regulatory File</h2>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-brand-100 text-brand-700 border border-brand-200">
              Deep analysis
            </span>
          </div>
          <RegulatoryFileSection itemId={item.id} />
        </div>

      </main>
      <Footer />
    </div>
  )
}
