'use client'

import { useState } from 'react'

export function EmailCapture() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    try {
      const res = await fetch('/api/email-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMessage(data.message || 'Thank you — we will be in touch.')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  return (
    <section className="py-20 bg-brand-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Stay ahead of regulatory change
        </h2>
        <p className="text-brand-200 mb-8">
          Get notified when BankScope Intelligence launches new features and sources. No spam.
        </p>
        {status === 'success' ? (
          <p className="text-green-400 font-medium text-lg">{message}</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="rounded-xl bg-white text-brand-900 px-6 py-3 text-sm font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {status === 'loading' ? 'Saving…' : 'Notify me'}
            </button>
          </form>
        )}
        {status === 'error' && (
          <p className="text-red-400 text-sm mt-3">{message}</p>
        )}
      </div>
    </section>
  )
}
