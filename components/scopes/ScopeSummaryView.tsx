'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { FirmClassification, ScopeSummary } from '@/lib/types'
import { getAccessToken } from '@/lib/auth/client'

// ── Helper subcomponents ────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  items,
  colorClass = 'bg-gray-50 border-gray-200',
  itemClass = 'text-gray-700',
}: {
  title: string
  icon: string
  items: string[]
  colorClass?: string
  itemClass?: string
}) {
  if (!items.length) return null
  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <span>{icon}</span>
        {title}
        <span className="ml-auto text-xs font-normal text-gray-400">{items.length}</span>
      </h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className={`text-sm leading-snug flex items-start gap-2 ${itemClass}`}>
            <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-current opacity-40" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function GenerationPrompt({
  creditBalance,
  loading,
  error,
  onGenerate,
}: {
  creditBalance: number | null
  loading: boolean
  error: string | null
  onGenerate: () => void
}) {
  const noCredits = creditBalance === 0
  const notSignedIn = creditBalance === null

  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
      <div className="text-3xl mb-3">📋</div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">
        No scope summary generated yet
      </h3>
      <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
        Generate a detailed regulatory scope summary tailored to this firm type — covering
        key obligations, regulators, compliance tasks, and suggested deliverables.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-left">
          {error}
        </div>
      )}

      {notSignedIn ? (
        <p className="text-sm text-gray-500">
          <a href="/auth/sign-in" className="text-brand-600 hover:underline font-medium">Sign in</a>{' '}
          to generate a scope summary (costs 1 credit).
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading || noCredits}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium
              hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                ✨ Generate scope summary
                <span className="text-brand-200 text-xs font-normal">(1 credit)</span>
              </>
            )}
          </button>

          {noCredits && (
            <p className="mt-3 text-xs text-red-500">
              You have no credits remaining. Please contact us to top up.
            </p>
          )}
          {!noCredits && creditBalance !== null && (
            <p className="mt-3 text-xs text-gray-400">
              You have{' '}
              <span className="font-medium text-gray-600">{creditBalance}</span>{' '}
              credit{creditBalance !== 1 ? 's' : ''} remaining.
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export interface ScopeSummaryViewProps {
  classification: FirmClassification
  initialSummary: ScopeSummary | null
  /** null = loading / not signed in — hides generate button while unknown */
  creditBalance: number | null
  /**
   * Called after a successful scope generation so the parent can propagate
   * the new compliance_tasks list to sibling components (e.g. ComplianceTaskList).
   */
  onScopeGenerated?: (tasks: string[], newCreditBalance: number) => void
}

export function ScopeSummaryView({
  classification,
  initialSummary,
  creditBalance: initialCreditBalance,
  onScopeGenerated,
}: ScopeSummaryViewProps) {
  const [summary, setSummary] = useState<ScopeSummary | null>(initialSummary)
  const [enrichedAt, setEnrichedAt] = useState<string | null>(
    classification.scope_enriched_at ?? null
  )
  const [fromCache, setFromCache] = useState<boolean>(Boolean(initialSummary))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creditBalance, setCreditBalance] = useState<number | null>(initialCreditBalance)

  // Sync credit balance when the parent (ScopePageClient) resolves it
  // useEffect runs only when initialCreditBalance changes from null to a number
  // We track whether parent has updated us by watching the prop directly.
  // Simpler: let ScopePageClient pass the up-to-date value — it re-renders with it.

  const handleGenerate = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/scopes/${classification.slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ force }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('Please sign in to generate a scope summary.')
        } else if (res.status === 402) {
          setError('You have no credits remaining. Please contact us to top up.')
          setCreditBalance(0)
        } else {
          setError(data.error ?? 'Generation failed. Please try again.')
        }
        return
      }

      setSummary(data.scope_summary)
      setEnrichedAt(data.scope_enriched_at ?? new Date().toISOString())
      setFromCache(Boolean(data.from_cache))

      const remaining = typeof data.credits_remaining === 'number'
        ? data.credits_remaining
        : creditBalance !== null
          ? creditBalance - (data.credits_used ?? 0)
          : null

      setCreditBalance(remaining)

      // Propagate new tasks + balance to parent so ComplianceTaskList updates
      if (onScopeGenerated && data.scope_summary?.compliance_tasks) {
        onScopeGenerated(
          data.scope_summary.compliance_tasks as string[],
          remaining ?? 0
        )
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [classification.slug, creditBalance, onScopeGenerated])

  // Keep local creditBalance in sync when parent resolves the value
  // (ScopePageClient fetches async; by the time it re-renders this component
  //  initialCreditBalance will have changed from null to a real number)
  const resolvedBalance = creditBalance ?? initialCreditBalance

  return (
    <div className="space-y-6">
      {/* ── Classification overview ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{classification.name}</h2>
            <p className="text-sm text-gray-600 mt-1">{classification.description}</p>
          </div>
          <Link
            href={`/dashboard?firm_classification=${classification.slug}`}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors"
          >
            View intelligence →
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-400 mb-1">Services</p>
            <div className="flex flex-wrap gap-1">
              {classification.services.map((s) => (
                <span key={s} className="inline-block px-2 py-0.5 rounded bg-white border border-indigo-100 text-indigo-700 text-[11px]">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-400 mb-1">Regulators</p>
            <div className="flex flex-wrap gap-1">
              {classification.regulators.map((r) => (
                <span key={r} className="inline-block px-2 py-0.5 rounded bg-indigo-600 text-white text-[11px] font-medium">
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-400 mb-1">Key obligations</p>
            <div className="flex flex-wrap gap-1">
              {classification.obligations.slice(0, 4).map((o) => (
                <span key={o} className="inline-block px-2 py-0.5 rounded bg-white border border-indigo-100 text-gray-700 text-[11px]">
                  {o}
                </span>
              ))}
              {classification.obligations.length > 4 && (
                <span className="inline-block px-2 py-0.5 rounded bg-white border border-indigo-100 text-gray-400 text-[11px]">
                  +{classification.obligations.length - 4} more
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scope summary or generation prompt ──────────────────────────────── */}
      {!summary ? (
        <GenerationPrompt
          creditBalance={resolvedBalance}
          loading={loading}
          error={error}
          onGenerate={() => handleGenerate(false)}
        />
      ) : (
        <div className="space-y-4">
          {/* Cache/generation status badge */}
          {enrichedAt && (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                fromCache ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {fromCache ? '✓ Cached' : '✨ Freshly generated'}
              </span>
              <span className="text-[10px] text-gray-400">
                Last updated {new Date(enrichedAt).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>
            </div>
          )}

          {/* High-level overview */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span>🔍</span> Regulatory overview
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">{summary.high_level_overview}</p>
          </div>

          {/* Grid of 4 sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard
              title="Key regulations"
              icon="📜"
              items={summary.key_regulations}
              colorClass="bg-amber-50 border-amber-200"
              itemClass="text-amber-900"
            />
            <SectionCard
              title="Key regulators"
              icon="🏛️"
              items={summary.key_regulators}
              colorClass="bg-purple-50 border-purple-200"
              itemClass="text-purple-900"
            />
            <SectionCard
              title="Compliance tasks"
              icon="✅"
              items={summary.compliance_tasks}
              colorClass="bg-green-50 border-green-200"
              itemClass="text-green-900"
            />
            <SectionCard
              title="Suggested deliverables"
              icon="📁"
              items={summary.suggested_deliverables}
              colorClass="bg-rose-50 border-rose-200"
              itemClass="text-rose-900"
            />
          </div>

          {/* Error + refresh */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              AI-generated — always verify against current FCA/regulator guidance.
            </p>
            {resolvedBalance !== null && (
              <button
                type="button"
                onClick={() => handleGenerate(true)}
                disabled={loading || resolvedBalance === 0}
                className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-40 transition-colors flex items-center gap-1"
                title={resolvedBalance === 0 ? 'No credits remaining' : `Refresh costs 1 credit (${resolvedBalance} remaining)`}
              >
                {loading ? '⟳ Refreshing…' : `⟳ Refresh (1 credit)`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
