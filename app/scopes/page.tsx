import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getFirmClassifications } from '@/lib/db/firm-classifications'
import { FIRM_CLASSIFICATION_STUBS } from '@/lib/db/firm-classifications'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Regulatory Scopes',
  description: 'Select your firm type to see tailored regulatory obligations, key regulators, compliance tasks, and suggested deliverables for UK financial services.',
}

export const revalidate = 3600   // refresh hourly (scope data changes rarely)

async function getClassificationsWithFallback() {
  try {
    return await getFirmClassifications()
  } catch {
    // If DB is unavailable (e.g. during build), fall back to static stubs
    return FIRM_CLASSIFICATION_STUBS.map((s) => ({
      ...s,
      id: s.id || s.slug,
      obligations: [] as string[],
      services: [] as string[],
      scope_summary: null,
      scope_enriched_at: null,
      created_at: '',
      updated_at: '',
    }))
  }
}

export default async function ScopesIndexPage() {
  const classifications = await getClassificationsWithFallback()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Regulatory Scopes</h1>
          <p className="text-gray-500 text-sm max-w-2xl">
            Select your firm type to see tailored regulatory obligations, key regulators,
            AI-generated compliance tasks, and suggested deliverables. All summaries are
            specific to the UK regulatory environment.
          </p>
        </div>

        {/* Classification grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {classifications.map((c) => {
            const hasScope = Boolean(c.scope_enriched_at)
            return (
              <Link
                key={c.slug}
                href={`/scopes/${c.slug}`}
                className="group rounded-xl border border-gray-200 bg-white p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                      {c.name}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1 leading-snug line-clamp-2">
                      {c.description}
                    </p>
                  </div>
                  {hasScope ? (
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                      ✓ Scope ready
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                      Generate
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {c.regulators.map((r) => (
                    <span
                      key={r}
                      className="inline-block px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </Link>
            )
          })}
        </div>

        <p className="mt-6 text-xs text-gray-400 text-center">
          More firm types coming soon. Scope summaries are AI-generated — always verify against current FCA and regulator guidance.
        </p>
      </main>

      <Footer />
    </div>
  )
}
