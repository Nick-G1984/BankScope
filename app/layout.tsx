import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { PostHogProvider } from '@/components/analytics/PostHogProvider'
import { PostHogPageView } from '@/components/analytics/PostHogPageView'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'BankScope Intelligence',
    template: '%s | BankScope Intelligence',
  },
  description:
    'AI-assisted regulatory and market intelligence for UK retail financial services. Plain-English summaries of FCA, PRA, BoE, ICO and HM Treasury publications.',
  keywords: [
    'FCA', 'PRA', 'Bank of England', 'regulatory intelligence', 'compliance',
    'UK banking', 'financial services', 'regulatory news', 'BankScope',
  ],
  openGraph: {
    title: 'BankScope Intelligence',
    description: 'AI-assisted regulatory intelligence for UK retail financial services.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <PostHogProvider>
          {/* PostHogPageView uses useSearchParams — must be inside Suspense */}
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          <AuthProvider>{children}</AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}
