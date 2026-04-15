'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signUp, getSession } from '@/lib/auth/client'

export function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/workspace'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Redirect if already signed in
  useEffect(() => {
    getSession().then((session) => {
      if (session) router.push(next)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const { data, error: authError } = await signUp(email.trim(), password)
      if (authError) {
        setError(authError.message)
        return
      }

      // If email confirmation is disabled in Supabase, user is immediately active
      if (data.session) {
        router.push(next)
        return
      }

      // Email confirmation enabled — show confirmation message
      setSuccess(true)
    } catch {
      setError('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="card p-8 text-center">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          We've sent a confirmation link to <strong>{email}</strong>.
          Click the link to activate your account and start generating deliverables.
        </p>
        <p className="text-gray-400 text-xs mt-4">
          Your account includes 3 free credits — no card required.
        </p>
      </div>
    )
  }

  return (
    <div className="card p-8">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-brand-700 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1.581.814L10 13.197l-4.419 3.617A1 1 0 014 16V4z"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="text-gray-500 text-sm mt-1">Free account · 3 credits included · No card needed</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Work email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Organisation <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
            placeholder="e.g. Acme Building Society"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating account…' : 'Create free account →'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="flex items-start gap-2 mb-3">
          <span className="text-green-500 flex-shrink-0">✓</span>
          <p className="text-xs text-gray-500">3 free credits to generate Delivery Briefs, Compliance Packs, Board Summaries & more</p>
        </div>
        <div className="flex items-start gap-2 mb-3">
          <span className="text-green-500 flex-shrink-0">✓</span>
          <p className="text-xs text-gray-500">Saved workspace — all your deliverables in one place</p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-green-500 flex-shrink-0">✓</span>
          <p className="text-xs text-gray-500">No credit card required</p>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link
          href={`/auth/sign-in${next !== '/workspace' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="text-brand-600 font-medium hover:underline"
        >
          Sign in →
        </Link>
      </div>
    </div>
  )
}
