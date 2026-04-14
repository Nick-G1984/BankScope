const FEATURES = [
  {
    icon: '📡',
    title: 'Live Source Monitoring',
    description:
      'Automatically pulls publications, press releases, speeches, and consultations from the FCA, PRA, Bank of England, ICO, HM Treasury, and Companies House every day.',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Summaries',
    description:
      'Every item is summarised in plain English by GPT-4o — no jargon, no lengthy PDFs to skim. Get the key point, who it affects, and what to do next.',
  },
  {
    icon: '🎯',
    title: 'Tagged by Urgency & Audience',
    description:
      'Items are scored Critical, High, Medium, or Low and tagged by affected firm type — banks, building societies, credit unions, specialist lenders, and more.',
  },
  {
    icon: '🔍',
    title: 'Searchable & Filterable',
    description:
      'Full-text search across all items, plus filters by regulator, topic tag, urgency, audience, content type, and date range.',
  },
  {
    icon: '📋',
    title: 'Suggested Next Steps',
    description:
      'Each item includes a concrete suggested action — whether to monitor a consultation, review a policy, or escalate to your compliance team.',
  },
  {
    icon: '⚡',
    title: 'Daily Automated Refresh',
    description:
      'The ingestion and summarisation pipeline runs automatically at 06:00 UTC every day, so your team always starts with a fresh briefing.',
  },
]

export function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything your team needs to stay ahead of regulation
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Built for compliance, risk, operations, and product teams at banks, building societies,
            savings providers, and specialist lenders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 hover:shadow-md transition-shadow">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 card p-8 bg-brand-50 border-brand-200 text-center">
          <p className="text-sm font-semibold text-brand-700 uppercase tracking-wide mb-2">Sources covered</p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {['FCA', 'PRA', 'Bank of England', 'ICO', 'HM Treasury', 'Companies House'].map((s) => (
              <span key={s} className="px-4 py-1.5 bg-white border border-brand-200 rounded-full text-sm font-medium text-brand-800">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
