'use client'

import { useState, useEffect } from 'react'
import type { FirmClassification, ScopeSummary } from '@/lib/types'
import { getAccessToken } from '@/lib/auth/client'
import { ScopeSummaryView } from './ScopeSummaryView'
import { ComplianceTaskList } from './ComplianceTaskList'

interface Props {
  classification: FirmClassification
  initialSummary: ScopeSummary | null
}

/**
 * Client wrapper that owns cross-component state on the scope detail page:
 *  - creditBalance  — fetched from /api/auth/profile on mount (null = loading / anon)
 *  - suggestedTasks — populated from the AI summary; updates when the scope is
 *                     (re)generated client-side so ComplianceTaskList sees new chips
 *                     without a full page reload.
 */
export function ScopePageClient({ classification, initialSummary }: Props) {
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [suggestedTasks, setSuggestedTasks] = useState<string[]>(
    initialSummary?.compliance_tasks ?? []
  )

  // ── Fetch auth state + credit balance on mount ────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function fetchProfile() {
      const token = await getAccessToken()
      if (!token) return   // not signed in — leave defaults

      if (cancelled) return
      setIsAuthenticated(true)

      try {
        const res = await fetch('/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok || cancelled) return
        const json = await res.json()
        if (!cancelled && typeof json?.profile?.credit_balance === 'number') {
          setCreditBalance(json.profile.credit_balance)
        }
      } catch {
        // Non-fatal — credit display will just remain blank
      }
    }

    fetchProfile()
    return () => { cancelled = true }
  }, [])

  // ── Called by ScopeSummaryView after a successful generation ─────────────
  function handleScopeGenerated(tasks: string[], newBalance: number) {
    setSuggestedTasks(tasks)
    setCreditBalance(newBalance)
  }

  return (
    <div className="space-y-8">
      <ScopeSummaryView
        classification={classification}
        initialSummary={initialSummary}
        creditBalance={creditBalance}
        onScopeGenerated={handleScopeGenerated}
      />

      <section>
        <ComplianceTaskList
          classificationId={classification.id}
          classificationSlug={classification.slug}
          suggestedTasks={suggestedTasks}
          isAuthenticated={isAuthenticated}
        />
      </section>
    </div>
  )
}
