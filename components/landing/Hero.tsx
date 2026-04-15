import Link from 'next/link'

const OUTCOMES = [
  'Turn regulatory updates into board-ready packs in minutes',
  'Convert FCA publications into delivery briefs your team can act on',
  'Save hours of manual regulatory interpretation',
]

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
            Daily updates from FCA, PRA, Bank of England and more
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Regulatory change.<br />
            <span className="text-brand-300">Turned into action.</span>
          </h1>

          <p className="text-xl text-blue-100 mb-6 leading-relaxed max-w-2xl">
            BankScope monitors UK financial services regulators, then generates professional
            deliverables your compliance, risk, PMO, and governance teams can use immediately.
          </p>

          <ul className="space-y-2 mb-10">
            {OUTCOMES.map((o) => (
              <li key={o} className="flex items-start gap-2.5 text-blue-100 text-sm">
                <span className="flex-shrink-0 mt-0.5 text-green-400">✓</span>
                {o}
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center justify-center rounded-xl bg-white text-brand-900 px-8 py-4 text-base font-semibold shadow-lg hover:bg-blue-50 transition-colors"
            >
              Get started free →
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-white/30 text-white px-8 py-4 text-base font-semibold hover:bg-white/10 transition-colors"
            >
              Browse intelligence
            </Link>
          </div>

          <p className="text-blue-300 text-xs mt-4">Free account · 3 credits included · No card required</p>
        </div>
      </div>
    </section>
  )
}
