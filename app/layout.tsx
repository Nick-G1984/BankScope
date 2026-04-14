import type { Metadata } from 'next'
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
      <body>{children}</body>
    </html>
  )
}
