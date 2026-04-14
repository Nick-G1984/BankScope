import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 text-white overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-blue-200 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Daily automated updates from FCA, PRA, Bank of England & more
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
            UK Financial Services<br />
            <span className="text-brand-300">Regulatory Intelligence</span><br />
            in Plain English
          </h1>

          <p className="text-xl text-blue-100 mb-10 leading-relaxed max-w-2xl">
            BankScope Intelligence monitors the FCA, PRA, Bank of England, ICO, and HM Treasury,
            then uses AI to turn regulatory signals into clear, actionable summaries — tagged by
            urgency, audience, and topic. Built for compliance, risk, and ops teams.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl bg-white text-brand-900 px-8 py-4 text-base font-semibold shadow-lg hover:bg-blue-50 transition-colors"
            >
              Open Intelligence Dashboard →
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-xl border border-white/30 text-white px-8 py-4 text-base font-semibold hover:bg-white/10 transition-colors"
            >
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
