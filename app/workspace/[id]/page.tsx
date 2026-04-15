'use client'

import { useEffect, useState, useCallback } from 'react'
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
  const [docxDownloading, setDocxDownloading] = useState(false)
  const [docxError, setDocxError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push(`/auth/sign-in?next=/workspace/${id}`)
      return
    }
    fetchOutput()
  }, [user, loading, id, accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

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

  /**
   * Download the output as a .docx file.
   * Triggers GET /api/outputs/[id]/docx with the user's Bearer token,
   * then constructs a temporary anchor to initiate the browser download.
   */
  async function handleDocxDownload() {
    if (!accessToken || !output) return
    setDocxError(null)
    setDocxDownloading(true)
    try {
      const res = await fetch(`/api/outputs/${id}/docx`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setDocxError(json.error ?? 'Download failed. Please try again.')
        return
      }
      // Stream the blob and trigger a browser download
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Extract filename from Content-Disposition header, or construct a fallback
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="([^"]+)"/)
      a.download = match?.[1] ?? `bankscope-output-${id.slice(0, 8)}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setDocxError('Download failed. Please try again.')
    } finally {
      setDocxDownloading(false)
    }
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
      <main className="flex-1 w-full py-8">

        {/* Toolbar */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-2 text-sm text-gray-500">
              <Link href="/workspace" className="hover:text-gray-900 transition-colors">
                My Workspace
              </Link>
              <span>/</span>
              <span className="text-gray-700 font-medium truncate max-w-[16rem]">
                {output.title}
              </span>
            </nav>

            <div className="flex items-center gap-2 flex-shrink-0">
              {output.intelligence_item_id && (
                <Link
                  href={`/dashboard/${output.intelligence_item_id}`}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors px-3 py-2 rounded-lg border border-brand-200 hover:bg-brand-50"
                >
                  View source ↗
                </Link>
              )}

              {/* ── DOCX Download ─── */}
              <button
                onClick={handleDocxDownload}
                disabled={docxDownloading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                title="Download as Microsoft Word document (.docx)"
              >
                {docxDownloading ? (
                  <>
                    <Spinner className="h-3.5 w-3.5 text-white" />
                    <span>Generating…</span>
                  </>
                ) : (
                  <>
                    {/* Word document icon */}
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download .docx</span>
                  </>
                )}
              </button>

              {/* ── PDF — future ─── */}
              <button
                disabled
                title="PDF export — coming soon"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-400 text-xs font-medium cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF <span className="text-[10px] bg-gray-100 text-gray-400 rounded px-1">Soon</span>
              </button>
            </div>
          </div>

          {docxError && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
              {docxError}
            </div>
          )}
        </div>

        {/* Document preview — max-w-5xl, white paper feel */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8 md:p-12 print:shadow-none print:border-0">
            <OutputViewer output={output} />
          </div>
        </div>

        {/* Footer nav */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex items-center justify-between">
          <Link href="/workspace" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← Back to workspace
          </Link>
          <Link href="/dashboard" className="text-sm text-brand-600 hover:text-brand-800 font-medium transition-colors">
            Browse more intelligence →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
