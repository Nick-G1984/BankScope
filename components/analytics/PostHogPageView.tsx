'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { usePostHog } from 'posthog-js/react'

/**
 * Fires a PostHog $pageview event on every App Router navigation.
 *
 * Must be rendered inside:
 *   1. <PostHogProvider> (so usePostHog() can resolve the client)
 *   2. <Suspense> (because useSearchParams() requires it in Next.js 14)
 *
 * Both requirements are satisfied by the placement in app/layout.tsx.
 */
export function PostHogPageView() {
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const posthog     = usePostHog()

  useEffect(() => {
    if (!pathname || !posthog) return

    let url = window.location.origin + pathname
    if (searchParams.toString()) {
      url += '?' + searchParams.toString()
    }

    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams, posthog])

  // Renders nothing — purely a side-effect component
  return null
}
