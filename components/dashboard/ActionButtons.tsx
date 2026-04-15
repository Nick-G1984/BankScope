'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import type { OutputType } from '@/lib/types'
import { OUTPUT_TYPE_LABELS, OUTPUT_TYPE_DESCRIPTIONS } from '@/lib/types'

// ── Auth gate modal ────────────────────────────────────────────────────────

function AuthGateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg">✕</button>
        <div className="text-3xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to generate deliverables</h2>
        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
          Create a free account to generate Delivery Briefs, Compliance Action Packs, Board Summaries, and more.
          New accounts get <strong>3 free credits</strong> — no card required.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => { router.push('/auth/sign-up'); onClose() }}
            className="btn-primary w-full text-center"
          >
            Create free account →
          </button>
          <button
            onClick={() => { router.push('/auth/sign-in'); onClose() }}
            className="btn-secondary w-full text-center"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Out-of-credits modal ───────────────────────────────────────────────────

function CreditModal({ balance, onClose }: { balance: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg">✕</button>
        <div className="text-3xl mb-4">💳</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {balance === 0 ? 'No credits remaining' : `${balance} credit${balance === 1 ? '' : 's'} remaining`}
        </h2>
        <p className="text-gray-600 text-sm mb-2 leading-relaxed">
          Each generated deliverable costs 1 credit. Upgrade to Pro for unlimited output generation.
        </p>
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-6">
          <p className="text-xs text-brand-800 font-medium mb-1">Pro Plan</p>
          <p className="text-xs text-brand-700">Unlimited deliverables · Full output history · Priority generation</p>
        </div>
        {/* PLACEHOLDER: Link this to your Stripe payment page */}
        <div className="flex flex-col gap-3">
          <a
            href="mailto:hello@bankscope.co.uk?subject=BankScope Pro Upgrade"
            className="btn-primary w-full text-center"
          >
            Contact us to upgrade →
          </a>
          <button onClick={onClose} className="btn-secondary w-full">
            Maybe later
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">
          Payment integration coming soon. Contact us for immediate access.
        </p>
      </div>
    </div>
  )
}

// ── Generation in-progress modal ───────────────────────────────────────────

function GeneratingModal({ outputType }: { outputType: OutputType }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <svg className="animate-spin h-10 w-10 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          Generating {OUTPUT_TYPE_LABELS[outputType]}…
        </h2>
        <p className="text-gray-500 text-sm">
          Analysing the regulatory item and drafting your deliverable. This typically takes 10–20 seconds.
        </p>
      </div>
    </div>
  )
}

// ── Main ActionButtons component ───────────────────────────────────────────

const OUTPUT_BUTTONS: { type: OutputType; icon: string; colour: string }[] = [
  { type: 'delivery_brief',      icon: '📋', colour: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100' },
  { type: 'compliance_pack',     icon: '⚖️', colour: 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100' },
  { type: 'governance_brief',    icon: '🏛️', colour: 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100' },
  { type: 'board_summary',       icon: '👔', colour: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100' },
  { type: 'implementation_plan', icon: '🗺️', colour: 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100' },
]

interface ActionButtonsProps {
  itemId: string
  itemTitle?: string
  /** compact = smaller buttons for card view, full = larger for detail page */
  variant?: 'compact' | 'full'
}

export function ActionButtons({ itemId, itemTitle, variant = 'full' }: ActionButtonsProps) {
  const router = useRouter()
  const { user, profile, accessToken, refreshProfile } = useAuth()

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [generating, setGenerating] = useState<OutputType | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate(outputType: OutputType) {
    setError(null)

    if (!user || !accessToken) {
      setShowAuthModal(true)
      return
    }

    if (!profile || profile.credit_balance < 1) {
      setShowCreditModal(true)
      return
    }

    setGenerating(outputType)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ item_id: itemId, output_type: outputType }),
      })

      const json = await res.json()

      if (!res.ok) {
        if (res.status === 402 || json.code === 'insufficient_credits') {
          setShowCreditModal(true)
        } else {
          setError(json.error ?? 'Generation failed. Please try again.')
        }
        return
      }

      // Refresh profile to update credit balance
      await refreshProfile()

      // Navigate to the output viewer
      router.push(`/workspace/${json.output.id}`)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setGenerating(null)
    }
  }

  if (variant === 'compact') {
    return (
      <>
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
          <p className="w-full text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Generate deliverable
          </p>
          {OUTPUT_BUTTONS.map(({ type, icon, colour }) => (
            <button
              key={type}
              onClick={() => handleGenerate(type)}
              disabled={generating !== null}
              title={OUTPUT_TYPE_DESCRIPTIONS[type]}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colour}`}
            >
              <span>{icon}</span>
              <span>{OUTPUT_TYPE_LABELS[type]}</span>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-600 mt-2">{error}</p>
        )}

        {generating && <GeneratingModal outputType={generating} />}
        {showAuthModal && <AuthGateModal onClose={() => setShowAuthModal(false)} />}
        {showCreditModal && <CreditModal balance={profile?.credit_balance ?? 0} onClose={() => setShowCreditModal(false)} />}
      </>
    )
  }

  // Full variant (detail page)
  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Generate deliverable
          </h2>
          {profile && (
            <span className="text-xs text-gray-400">
              {profile.credit_balance} credit{profile.credit_balance !== 1 ? 's' : ''} remaining
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OUTPUT_BUTTONS.map(({ type, icon, colour }) => (
            <button
              key={type}
              onClick={() => handleGenerate(type)}
              disabled={generating !== null}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm ${colour}`}
            >
              <span className="text-2xl flex-shrink-0">{icon}</span>
              <div>
                <p className="font-semibold text-sm">{OUTPUT_TYPE_LABELS[type]}</p>
                <p className="text-xs opacity-75 leading-relaxed mt-0.5">
                  {OUTPUT_TYPE_DESCRIPTIONS[type]}
                </p>
              </div>
            </button>
          ))}

          {/* Export PDF — navigates to print view */}
          <button
            onClick={() => window.open(`/dashboard/${itemId}?print=true`, '_blank')}
            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-left text-gray-700 transition-all hover:bg-gray-100 hover:shadow-sm"
          >
            <span className="text-2xl flex-shrink-0">📄</span>
            <div>
              <p className="font-semibold text-sm">Export PDF</p>
              <p className="text-xs opacity-75 leading-relaxed mt-0.5">
                Print-ready view of this intelligence item
              </p>
            </div>
          </button>
        </div>

        {!user && (
          <p className="text-xs text-gray-500 text-center pt-1">
            <button onClick={() => setShowAuthModal(true)} className="text-brand-600 hover:underline font-medium">
              Sign in
            </button> or{' '}
            <button onClick={() => setShowAuthModal(true)} className="text-brand-600 hover:underline font-medium">
              create a free account
            </button>{' '}
            to generate deliverables. New users get 3 free credits.
          </p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {generating && <GeneratingModal outputType={generating} />}
      {showAuthModal && <AuthGateModal onClose={() => setShowAuthModal(false)} />}
      {showCreditModal && <CreditModal balance={profile?.credit_balance ?? 0} onClose={() => setShowCreditModal(false)} />}
    </>
  )
}
