'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { Spinner } from '@/components/ui/Spinner'

export function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(searchParams.get('search') ?? '')

  const updateSearch = useCallback(
    (newValue: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (newValue) {
        params.set('search', newValue)
      } else {
        params.delete('search')
      }
      params.delete('page')
      startTransition(() => {
        router.push(`/dashboard?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateSearch(value)
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex-1">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
        {isPending ? (
          <Spinner className="h-4 w-4" />
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
      </div>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search intelligence items…"
        className="input pl-10 pr-4 h-11 w-full"
      />
    </form>
  )
}
