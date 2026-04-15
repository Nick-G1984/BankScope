'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { OutputViewer } from '@/components/workspace/OutputViewer'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/components/auth/AuthProvider'
import type { GeneratedOutput } from '@/lib/types'

export default function OutputPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading, accessToken } = useAuth()
  const [output, setOutput] = useState<GeneratedOutput | null>(null)
  const [fetching, setFetching] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push(`/auth/sign-in?next=/workspace/${id}`)
      return
    }
    fetchOutput()
  }, [user, loading, id, accessToken])

  async function fetchOutput() {
    if (!accessToken) return
    setFetching(true)
    try {
      const res = await fetch(`/api/outputs/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.status === 404) {
        setNotFound(true)
        return
      }
      if (res.ok) {
        const json = await res.json()
        setOutput(json.output)
      }
    } finally {
      setFetching(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  if (loading || fetching) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Spinner className="h-8 w-8" />
        </main>
        <Footer />
      </div>
    )
  }

  if (notFound || !output) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-16 text-center">
          <p className="text-gray-700 font-medium mb-2">Deliverable not found</p>
          <p className="text-gray-500 text-sm mb-6">
            This output may have been deleted or doesn't belong to your account.
          </p>
          <Link href="/workspace" className="btn-secondary">← Back to workspace</Link>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/workspace" className="hover:text-gray-900 transition-colors">
              My Workspace
            </Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">Output</span>
          </nav>
          <div className="flex items-center gap-3">
            {output.intelligence_item_id && (
              <Link
                href={`/dashboard/${output.intelligence_item_id}`}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
              >
                View source item ↗
              </Link>
            )}
            <button
              onClick={handlePrint}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <span>🖨️</span> Print / Save PDF
            </button>
          </div>
        </div>

        <div className="card p-6 md:p-8 print:shadow-none print:border-0">
          <OutputViewer output={output} />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Link href="/workspace" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← Back to workspace
          </Link>
          <Link href="/dashboard" className="text-sm text-brand-600 hover:text-brand-800 font-medium transition-colors">
            Browse more intelligence items →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
