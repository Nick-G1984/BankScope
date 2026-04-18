import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { TimelineView } from '@/components/roadmap/TimelineView'
import { ROADMAP_MILESTONES, ROADMAP_THEMES } from '@/lib/roadmap/data'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Regulatory Roadmap',
  description:
    'A forward-looking timeline of UK financial services regulatory milestones — Consumer Duty, Operational Resilience, APP Fraud, BNPL, Motor Finance, and more.',
}

// Static data — no DB dependency, revalidate annually
export const revalidate = 86400

// ── Theme overview strip ──────────────────────────────────────────────────────

function ThemeOverview() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      {ROADMAP_THEMES.map((t) => (
        <div
          key={t.id}
          className={`rounded-xl border p-3 ${t.color.bg} ${t.color.border}`}
        >
          <div className="text-xl mb-1">{t.icon}</div>
          <p className={`text-xs font-semibold ${t.color.text} leading-snug`}>
            {t.title}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
            {t.description}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Page header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Regulatory Roadmap</h1>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-brand-100 text-brand-700 border border-brand-200">
              Beta
            </span>
          </div>
          <p className="text-gray-500 text-sm max-w-2xl">
            Key UK financial services regulatory milestones — confirmed deadlines, expected consultations,
            and emerging obligations — grouped by theme and quarter.
          </p>
        </div>

        {/* ── Theme overview ── */}
        <ThemeOverview />

        {/* ── Timeline with client-side filtering ── */}
        <TimelineView milestones={ROADMAP_MILESTONES} themes={ROADMAP_THEMES} />
      </main>

      <Footer />
    </div>
  )
}
