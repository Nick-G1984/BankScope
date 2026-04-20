import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ScopePageClient } from '@/components/scopes/ScopePageClient'
import { getFirmClassificationBySlug } from '@/lib/db/firm-classifications'
import type { Metadata } from 'next'

interface Props {
  params: { slug: string }
}

// Auth and task fetching are handled client-side inside ScopePageClient.
// This page only needs a server-rendered shell with the classification data.
export const dynamic = 'force-dynamic'   // classification data changes when scopes are generated

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const classification = await getFirmClassificationBySlug(params.slug)
  if (!classification) return { title: 'Scope not found' }
  return {
    title: `${classification.name} — Regulatory Scope`,
    description: `Regulatory obligations, key regulators, compliance tasks and deliverables for ${classification.name} in the UK.`,
  }
}

export default async function ScopePage({ params }: Props) {
  const { slug } = params

  const classification = await getFirmClassificationBySlug(slug)
  if (!classification) notFound()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard" className="hover:text-gray-900 transition-colors">
            Dashboard
          </Link>
          <span>›</span>
          <Link href="/scopes" className="hover:text-gray-900 transition-colors">
            Regulatory scopes
          </Link>
          <span>›</span>
          <span className="text-gray-900 font-medium">{classification.name}</span>
        </div>

        {/* All interactive content is inside the client wrapper */}
        <ScopePageClient
          classification={classification}
          initialSummary={classification.scope_summary ?? null}
        />
      </main>

      <Footer />
    </div>
  )
}
