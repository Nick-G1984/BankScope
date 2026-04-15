'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

// Module-level flag — ensures init() is called exactly once per page load,
// even if React renders / mounts this component more than once (e.g. HMR, StrictMode).
let posthogInitialised = false

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (posthogInitialised) return

    const token = process.env.NEXT_PUBLIC_POSTHOG_TOKEN
    const host  = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'

    if (!token) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[PostHog] NEXT_PUBLIC_POSTHOG_TOKEN is not set — analytics disabled.')
      }
      return
    }

    posthog.init(token, {
      api_host: host,
      ui_host: 'https://eu.posthog.com',

      // Disable automatic pageview capture — we handle it manually via
      // PostHogPageView so that App Router soft-navigations are tracked correctly.
      capture_pageview: false,

      // Persist identity across sessions in both localStorage and cookies.
      persistence: 'localStorage+cookie',

      // Enable debug logging in development only.
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') ph.debug()
      },
    })

    posthogInitialised = true
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
