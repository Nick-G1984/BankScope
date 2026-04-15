import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Badge, UrgencyDot } from '@/components/ui/Badge'
import type { IntelligenceItem } from '@/lib/types'

function toLabel(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Action required label + colour
const ACTION_STYLES: Record<string, { label: string; classes: string }> = {
  yes:         { label: 'Action required',   classes: 'bg-red-50 text-red-700 border border-red-200' },
  monitor:     { label: 'Monitor',           classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
  awareness:   { label: 'Awareness only',    classes: 'bg-gray-100 text-gray-600 border border-gray-200' },
}

interface Props {
  item: IntelligenceItem
}

export function IntelligenceCard({ item }: Props) {
  const publishDate = item.publish_date
    ? format(parseISO(item.publish_date), 'd MMM yyyy')
    : null

  const actionStyle = item.action_required ? ACTION_STYLES[item.action_required] : null

  return (
    <article className="card p-5 hover:shadow-md transition-all hover:border-brand-200 group">

      {/* ── Header row: badges + priority score ── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Badge variant="source">{item.source_name}</Badge>
          <Badge variant="content">{toLabel(item.content_type)}</Badge>
          {item.urgency && (
            <span className={`badge badge-${item.urgency} flex items-center gap-1.5`}>
              <UrgencyDot urgency={item.urgency} />
              {toLabel(item.urgency)}
            </span>
          )}
          {actionStyle && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${actionStyle.classes}`}>
              {actionStyle.label}
            </span>
          )}
        </div>
        {item.priority_score != null && (
          <div
            title={item.priority_rationale ?? 'Priority score'}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold cursor-help"
          >
            {item.priority_score}
          </div>
        )}
      </div>

      {/* ── Title ── */}
      <Link href={`/dashboard/${item.id}`} className="group/link">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 group-hover/link:text-brand-700 transition-colors line-clamp-2">
          {item.title}
        </h3>
      </Link>

      {/* ── Why it matters — highlighted callout ── */}
      {item.why_it_matters && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-amber-900 leading-relaxed">
            <span className="font-semibold">Why it matters: </span>
            {item.why_it_matters}
          </p>
        </div>
      )}

      {/* ── AI summary or raw excerpt (fallback) ── */}
      {!item.why_it_matters && (
        item.ai_summary ? (
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-3">
            {item.ai_summary}
          </p>
        ) : item.raw_excerpt ? (
          <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-3 italic">
            {item.raw_excerpt}
          </p>
        ) : null
      )}

      {/* ── Suggested next step ── */}
      {item.suggested_next_step && (
        <div className="bg-brand-50 border border-brand-100 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-brand-800">
            <span className="font-semibold">Next step: </span>
            {item.suggested_next_step}
          </p>
        </div>
      )}

      {/* ── Affected functions ── */}
      {item.affected_functions && item.affected_functions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {item.affected_functions.slice(0, 4).map((fn) => (
            <span
              key={fn}
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-purple-50 text-purple-700 border border-purple-100"
            >
              {toLabel(fn)}
            </span>
          ))}
          {item.affected_functions.length > 4 && (
            <span className="text-xs text-gray-400">+{item.affected_functions.length - 4} more</span>
          )}
        </div>
      )}

      {/* ── Category tags ── */}
      {item.category_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {item.category_tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-gray-100 text-gray-600"
            >
              {tag}
            </span>
          ))}
          {item.category_tags.length > 3 && (
            <span className="text-xs text-gray-400">+{item.category_tags.length - 3} more</span>
          )}
        </div>
      )}

      {/* ── Footer: date, source link, view ── */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-3">
          {publishDate && (
            <span className="text-xs text-gray-400">{publishDate}</span>
          )}
          {!item.is_processed && (
            <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Pending AI</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Source ↗
            </a>
          )}
          <Link href={`/dashboard/${item.id}`} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
            View →
          </Link>
        </div>
      </div>
    </article>
  )
}
