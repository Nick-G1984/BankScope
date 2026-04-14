import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Badge, UrgencyDot } from '@/components/ui/Badge'
import { getIntelligenceItemById } from '@/lib/db/intelligence'
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

export default async function ItemDetailPage({ params }: Props) {
  const item = await getIntelligenceItemById(params.id)
  if (!item) notFound()

  const publishDate = item.publish_date
    ? format(parseISO(item.publish_date), 'EEEE d MMMM yyyy')
    : null

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          ← Back to dashboard
        </Link>

        <article className="card p-6 md:p-8">
          {/* Header badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="source">{item.source_name}</Badge>
            <Badge variant="content">{toLabel(item.content_type)}</Badge>
            {item.urgency && (
              <span className={`badge badge-${item.urgency} flex items-center gap-1.5`}>
                <UrgencyDot urgency={item.urgency} />
                {toLabel(item.urgency)} priority
              </span>
            )}
            {item.priority_score != null && (
              <span className="badge bg-brand-100 text-brand-800">
                Score: {item.priority_score}/10
              </span>
            )}
            <span className={`badge ${item.confidence_status === 'reviewed' ? 'bg-green-100 text-green-800' : item.confidence_status === 'ai-generated' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
              {item.confidence_status === 'ai-generated' ? 'AI summarised' : item.confidence_status === 'reviewed' ? 'Reviewed' : 'Pending AI'}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{item.title}</h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-100">
            {publishDate && <span>{publishDate}</span>}
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

          {/* AI Summary */}
          {item.ai_summary && (
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">AI Summary</h2>
              <p className="text-gray-800 leading-relaxed text-base">{item.ai_summary}</p>
            </section>
          )}

          {/* Suggested next step */}
          {item.suggested_next_step && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-6">
              <h2 className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-2">Suggested next step</h2>
              <p className="text-brand-900 text-sm leading-relaxed">{item.suggested_next_step}</p>
            </div>
          )}

          {/* Two-column meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            {item.affected_audience.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Affected audience</h2>
                <div className="flex flex-wrap gap-1.5">
                  {item.affected_audience.map((a) => (
                    <span key={a} className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs bg-blue-50 text-blue-800 border border-blue-200">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
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

          {/* Raw excerpt */}
          {item.raw_excerpt && (
            <section className="border-t border-gray-100 pt-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Raw excerpt (from source)</h2>
              <p className="text-gray-500 text-sm leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-200">
                {item.raw_excerpt}
              </p>
            </section>
          )}
        </article>
      </main>
      <Footer />
    </div>
  )
}
