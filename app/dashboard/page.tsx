import { Suspense } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SearchBar } from '@/components/dashboard/SearchBar'
import { Filters } from '@/components/dashboard/Filters'
import { IntelligenceList } from '@/components/dashboard/IntelligenceList'
import { Spinner } from '@/components/ui/Spinner'
import { getDashboardStats } from '@/lib/db/intelligence'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Intelligence Dashboard',
  description: 'Searchable feed of AI-summarised UK financial services regulatory intelligence.',
}

export const revalidate = 60

async function StatsBar() {
  try {
    const stats = await getDashboardStats()
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total items', value: stats.total_items.toLocaleString() },
          { label: 'Added today', value: stats.today_items.toLocaleString() },
          { label: 'Pending AI', value: stats.unprocessed.toLocaleString() },
          { label: 'Active sources', value: stats.sources_active.toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="card px-4 py-3 text-center">
            <p className="text-2xl font-bold text-brand-700">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    )
  } catch {
    return null
  }
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Intelligence Dashboard</h1>
          <p className="text-gray-500 text-sm">
            Live regulatory and market signals from UK financial services authorities, AI-summarised and tagged.
          </p>
        </div>

        <Suspense fallback={null}>
          <StatsBar />
        </Suspense>

        <div className="card p-4 mb-6 space-y-4">
          <Suspense fallback={<div className="h-10 animate-pulse bg-gray-100 rounded-lg" />}>
            <SearchBar />
          </Suspense>
          <Suspense fallback={<div className="h-10 animate-pulse bg-gray-100 rounded-lg" />}>
            <Filters />
          </Suspense>
        </div>

        <Suspense fallback={<div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>}>
          <IntelligenceList />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
