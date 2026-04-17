'use client'

/**
 * RegulatoryFileSection
 *
 * Client component that wraps the full regulatory file workflow for an
 * intelligence item detail page:
 *
 *  1. On mount, GETs /api/regulatory-files/[itemId] to check if a file exists.
 *  2. If no file → renders the <RegulatoryFileEmpty> "Generate" prompt.
 *  3. If enrichment_status === 'in_progress' → shows a spinner and polls
 *     every 5 s until the status changes.
 *  4. If completed → renders the full <RegulatoryFileView> dossier.
 *  5. If failed → renders the <RegulatoryFileFailed> retry UI.
 *
 * The component fetches its own auth token via sessionStorage (same pattern
 * used by the workspace page) — it does NOT receive auth as a prop.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  RegulatoryFileView,
  RegulatoryFileLoading,
  RegulatoryFileEmpty,
  RegulatoryFileFailed,
} from './RegulatoryFileView'
import type { RegulatoryFile } from '@/lib/types/regulatory-file'

type SectionState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'in_progress' }
  | { status: 'completed'; file: RegulatoryFile }
  | { status: 'failed'; file: RegulatoryFile; error: string }
  | { status: 'error'; message: string }

/** Reads the session token from localStorage (set by AuthProvider) */
function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    // Supabase stores the session under 'supabase.auth.token' or similar keys;
    // we read it through the same key the AuthProvider sets it.
    const raw = localStorage.getItem('sb-access-token')
    if (raw) return raw
    // Fallback: scan localStorage for a Supabase session key
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? ''
      if (key.includes('supabase') && key.includes('token')) {
        const item = localStorage.getItem(key)
        if (item) {
          try {
            const parsed = JSON.parse(item)
            return parsed?.access_token ?? parsed?.currentSession?.access_token ?? null
          } catch {
            // not JSON
          }
        }
      }
    }
  } catch {
    // localStorage may be unavailable in some contexts
  }
  return null
}

async function apiFetch(path: string, options?: RequestInit) {
  const token = getToken()
  return fetch(path, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
  })
}

export function RegulatoryFileSection({ itemId }: { itemId: string }) {
  const [state, setState] = useState<SectionState>({ status: 'loading' })
  const [generating, setGenerating] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Fetch existing file ──
  const fetchFile = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/regulatory-files/${itemId}`)
      if (res.status === 404) {
        setState({ status: 'not_found' })
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setState({ status: 'error', message: body.error ?? 'Failed to fetch regulatory file' })
        return
      }
      const data = await res.json()
      const file: RegulatoryFile = data.regulatory_file
      if (file.enrichment_status === 'in_progress') {
        setState({ status: 'in_progress' })
      } else if (file.enrichment_status === 'completed') {
        setState({ status: 'completed', file })
        if (pollRef.current) clearInterval(pollRef.current)
      } else if (file.enrichment_status === 'failed') {
        setState({ status: 'failed', file, error: file.enrichment_error ?? 'Unknown enrichment error' })
        if (pollRef.current) clearInterval(pollRef.current)
      } else {
        setState({ status: 'in_progress' })
      }
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Network error' })
    }
  }, [itemId])

  // ── Trigger enrichment ──
  const triggerEnrichment = useCallback(async (force = false) => {
    try {
      const res = await apiFetch(`/api/regulatory-files/${itemId}`, {
        method: 'POST',
        body: JSON.stringify({ force }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const errMsg = data.error ?? 'Enrichment request failed'
        // If a previous file exists (failed state), show the error inline
        setState((prev) => {
          if (prev.status === 'failed') {
            return { ...prev, error: errMsg }
          }
          return { status: 'error', message: errMsg }
        })
        return
      }

      const file: RegulatoryFile = data.regulatory_file
      if (file.enrichment_status === 'completed') {
        setState({ status: 'completed', file })
      } else {
        // in_progress — start polling
        setState({ status: 'in_progress' })
      }
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Network error' })
    }
  }, [itemId])

  // ── Initial fetch on mount ──
  useEffect(() => {
    fetchFile()
  }, [fetchFile])

  // ── Poll when in_progress ──
  useEffect(() => {
    if (state.status === 'in_progress') {
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(fetchFile, 5000)
    } else {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [state.status, fetchFile])

  // ── Generate handler ──
  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setState({ status: 'in_progress' })
    await triggerEnrichment(false)
    setGenerating(false)
  }, [triggerEnrichment])

  // ── Retry handler ──
  const handleRetry = useCallback(async () => {
    setRetrying(true)
    setState({ status: 'in_progress' })
    await triggerEnrichment(true)
    setRetrying(false)
  }, [triggerEnrichment])

  // ── Render ──

  if (state.status === 'loading') {
    return (
      <div className="py-8">
        <RegulatoryFileLoading />
      </div>
    )
  }

  if (state.status === 'not_found') {
    return (
      <div className="py-4">
        <RegulatoryFileEmpty
          itemId={itemId}
          onGenerate={handleGenerate}
          generating={generating}
        />
      </div>
    )
  }

  if (state.status === 'in_progress') {
    return (
      <div className="py-8 text-center">
        <div className="inline-flex items-center gap-3 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-6 py-4 shadow-sm">
          <span className="inline-block w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span>Generating regulatory file… this takes about 30 seconds</span>
        </div>
      </div>
    )
  }

  if (state.status === 'failed') {
    return (
      <div className="py-4">
        <RegulatoryFileFailed
          error={state.error}
          onRetry={handleRetry}
          retrying={retrying}
        />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="py-4 border border-red-200 rounded-xl bg-red-50 p-4">
        <p className="text-sm text-red-700">
          <span className="font-semibold">Error: </span>{state.message}
        </p>
        <button
          type="button"
          onClick={fetchFile}
          className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  // status === 'completed'
  return (
    <div className="py-4">
      <RegulatoryFileView file={state.file} />
    </div>
  )
}
