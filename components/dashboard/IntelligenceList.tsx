'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { IntelligenceCard } from './IntelligenceCard'
import { Spinner } from '@/components/ui/Spinner'
import type { IntelligenceItem, PaginatedResponse } from '@/lib/types'

export function IntelligenceList() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<PaginatedResponse<IntelligenceItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/intelligence?${searchParams.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load intelligence items')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [searchParams])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-600 font-medium mb-2">Failed to load intelligence items</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <p className="text-gray-700 font-medium mb-1">No intelligence items found</p>
        <p className="text-gray-500 text-sm">Try adjusting your filters or search terms.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{data.total.toLocaleString()}</span>{' '}
          {data.total === 1 ? 'item' : 'items'} found
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.data.map((item) => (
          <IntelligenceCard key={item.id} item={item} />
        ))}
      </div>

      {/* Pagination */}
      {data.total > data.limit && (
        <Pagination
          page={data.page}
          limit={data.limit}
          total={data.total}
        />
      )}
    </div>
  )
}

function Pagination({ page, limit, total }: { page: number; limit: number; total: number }) {
  const totalPages = Math.ceil(total / limit)

  function goToPage(p: number) {
    const params = new URLSearchParams(window.location.search)
    params.set('page', String(p))
    window.history.pushState(null, '', `?${params.toString()}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-200">
      <p className="text-sm text-gray-600">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <button onClick={() => goToPage(page - 1)} className="btn-secondary text-sm px-3 py-2">
            ← Previous
          </button>
        )}
        {page < totalPages && (
          <button onClick={() => goToPage(page + 1)} className="btn-primary text-sm px-3 py-2">
            Next →
          </button>
        )}
      </div>
    </div>
  )
}
