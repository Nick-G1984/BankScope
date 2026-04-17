'use client'

/**
 * RegulatoryFileSection
 *
 * Client component that wraps the full regulatory file workflow for an
 * intelligence item detail page. Manages two independent async phases:
 *
 * Phase 1 — Regulatory file generation:
 *   1. On mount, GETs /api/regulatory-files/[itemId] to check if a file exists.
 *   2. If no file → renders the <RegulatoryFileEmpty> "Generate" prompt.
 *   3. If enrichment_status === 'in_progress' → shows a spinner and polls
 *      every 5 s until the status changes.
 *   4. If completed → renders the full <RegulatoryFileView> dossier.
 *   5. If failed → renders the <RegulatoryFileFailed> retry UI.
 *
 * Phase 2 — Verified commentary enrichment:
 *   Triggered by the user clicking "Find trusted commentary" inside Section 9
 *   of the dossier. POSTs to /api/regulatory-files/[itemId]/commentary and
 *   re-fetches the file on success. Commentary state is tracked independently
 *   so it never interrupts the Phase 1 view.
 *
 * Auth: uses getAccessToken() from lib/auth/client — the Supabase JS client's
 * getSession() — which is the canonical, non-heuristic token source.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  RegulatoryFileView,
  RegulatoryFileLoading,
  RegulatoryFileEmpty,
  RegulatoryFileFailed,
} from './RegulatoryFileView'
import type { RegulatoryFile } from '@/lib/types/regulatory-file'
import { getAccessToken } from '@/lib/auth/client'

// ── Types ────────────────────────────────────────────────────────────────────

type SectionState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'in_progress' }
  | { status: 'completed'; file: RegulatoryFile }
  | { status: 'failed'; file: RegulatoryFile; error: string }
  | { status: 'error'; message: string }

// ── Auth-aware fetch helper ───────────────────────────────────────────────────

/**
 * Wraps fetch() with a Bearer token obtained from the Supabase JS client.
 * Uses getAccessToken() which calls supabase.auth.getSession() under the hood —
 * the real, reliable token source rather than a localStorage key scan.
 */
async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = await getAccessToken()
  return fetch(path, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

// ── Component ────────────────────────────────────────────────────────────────

export function RegulatoryFileSection({ itemId }: { itemId: string }) {
  // Phase 1 state
  const [state, setState] = useState<SectionState>({ status: 'loading' })
  const [generating, setGenerating] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Phase 2 commentary state — tracked independently from Phase 1
  const [commentarySearching, setCommentarySearching] = useState(false)
  const [commentaryError, setCommentaryError] = useState<string | null>(null)

  // ── Fetch existing file (Phase 1) ──────────────────────────────────────────

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
        setState({
          status: 'failed',
          file,
          error: file.enrichment_error ?? 'Unknown enrichment error',
        })
        if (pollRef.current) clearInterval(pollRef.current)
      } else {
        // 'pending' — treat as in_progress so we poll
        setState({ status: 'in_progress' })
      }
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Network error' })
    }
  }, [itemId])

  // ── Trigger Phase 1 enrichment ─────────────────────────────────────────────

  const triggerEnrichment = useCallback(async (force = false) => {
    try {
      const res = await apiFetch(`/api/regulatory-files/${itemId}`, {
        method: 'POST',
        body: JSON.stringify({ force }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const errMsg = data.error ?? 'Enrichment request failed'
        setState((prev) => {
          if (prev.status === 'failed') return { ...prev, error: errMsg }
          return { status: 'error', message: errMsg }
        })
        return
      }

      const file: RegulatoryFile = data.regulatory_file
      if (file.enrichment_status === 'completed') {
        setState({ status: 'completed', file })
      } else {
        // in_progress — polling will pick it up
        setState({ status: 'in_progress' })
      }
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Network error' })
    }
  }, [itemId])

  // ── Trigger Phase 2 commentary enrichment ─────────────────────────────────

  const handleFindCommentary = useCallback(async () => {
    setCommentarySearching(true)
    setCommentaryError(null)

    try {
      const res = await apiFetch(`/api/regulatory-files/${itemId}/commentary`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 422) {
          // Not eligible — communicate clearly but don't treat as a hard failure
          setCommentaryError(
            data.error ??
              'This item does not currently meet the criteria for commentary search ' +
              '(urgency, priority, or content type). You can still use the research queries below.'
          )
        } else if (res.status === 503) {
          setCommentaryError(
            'Commentary search is not configured on this server. ' +
              'Contact your administrator to set up a TAVILY_API_KEY or BING_SEARCH_API_KEY.'
          )
        } else if (res.status === 400) {
          setCommentaryError(
            data.error ?? 'Phase 1 regulatory file must be complete before searching for commentary.'
          )
        } else {
          setCommentaryError(data.error ?? 'Commentary search failed. Please try again.')
        }
        return
      }

      // Success — re-fetch the full file to pick up updated commentary fields.
      // The commentary_status and external_commentary are now stored in the DB.
      await fetchFile()
    } catch (err) {
      setCommentaryError(err instanceof Error ? err.message : 'Network error. Please try again.')
    } finally {
      setCommentarySearching(false)
    }
  }, [itemId, fetchFile])

  // ── Initial fetch on mount ─────────────────────────────────────────────────

  useEffect(() => {
    fetchFile()
  }, [fetchFile])

  // ── Poll while Phase 1 is in_progress ─────────────────────────────────────

  useEffect(() => {
    if (state.status === 'in_progress') {
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(fetchFile, 5000)
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [state.status, fetchFile])

  // ── Phase 1 generate / retry handlers ─────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setState({ status: 'in_progress' })
    await triggerEnrichment(false)
    setGenerating(false)
  }, [triggerEnrichment])

  const handleRetry = useCallback(async () => {
    setRetrying(true)
    setState({ status: 'in_progress' })
    await triggerEnrichment(true)
    setRetrying(false)
  }, [triggerEnrichment])

  // ── Render ─────────────────────────────────────────────────────────────────

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
          <span className="font-semibold">Error: </span>
          {state.message}
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

  // status === 'completed' — render the full dossier with Phase 2 props wired in
  return (
    <div className="py-4">
      <RegulatoryFileView
        file={state.file}
        onFindCommentary={handleFindCommentary}
        commentarySearching={commentarySearching}
        commentaryError={commentaryError}
        onClearCommentaryError={() => setCommentaryError(null)}
      />
    </div>
  )
}
