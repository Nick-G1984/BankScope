import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-700 rounded flex items-center justify-center">
              <svg className="text-white" fill="currentColor" viewBox="0 0 20 20" width="12" height="12">
                <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1.581.814L10 13.197l-4.419 3.617A1 1 0 014 16V4z"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-700">BankScope Intelligence</span>
          </div>
          <p className="text-xs text-gray-500 text-center">
            For informational purposes only. Always verify regulatory items with official sources.
            Data sourced from FCA, PRA, Bank of England, ICO, and HM Treasury.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <Link href="/dashboard" className="hover:text-gray-900 transition-colors">Dashboard</Link>
            <span>·</span>
            <span>© {new Date().getFullYear()} BankScope Intelligence</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
