const DELIVERABLES = [
  {
    icon: '📋',
    title: 'Delivery Brief',
    colour: 'border-blue-200 bg-blue-50',
    description: 'What changed, key risks, recommended owners, and immediate actions — ready for your change or delivery team.',
  },
  {
    icon: '⚖️',
    title: 'Compliance Action Pack',
    colour: 'border-green-200 bg-green-50',
    description: 'Regulatory obligations, impacted policies, controls to review, and evidence requirements in one structured document.',
  },
  {
    icon: '🏛️',
    title: 'Governance Brief',
    colour: 'border-purple-200 bg-purple-50',
    description: 'Decision points, risk areas, dependencies, and governance forums — so the right people are informed at the right time.',
  },
  {
    icon: '👔',
    title: 'Board Summary',
    colour: 'border-amber-200 bg-amber-50',
    description: 'Plain-English executive summary, strategic relevance, regulatory exposure, and questions for management.',
  },
  {
    icon: '🗺️',
    title: 'Implementation Plan',
    colour: 'border-orange-200 bg-orange-50',
    description: 'Workstreams, milestones, RAID log starter, and a 30/60/90-day delivery sequence for your PMO.',
  },
]

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'We monitor the regulators',
    description: 'BankScope automatically tracks the FCA, PRA, Bank of England, ICO, and HM Treasury — pulling publications, consultations, speeches, and enforcement notices every day.',
  },
  {
    step: '2',
    title: 'We summarise and prioritise',
    description: 'Each item is AI-summarised in plain English, tagged by urgency, regulatory theme, and internal function relevance. No jargon. No lengthy PDFs.',
  },
  {
    step: '3',
    title: 'You generate the deliverable',
    description: 'With one click, turn any intelligence item into a Delivery Brief, Compliance Pack, Governance Brief, Board Summary, or Implementation Plan. Ready in seconds.',
  },
]

export function Features() {
  return (
    <>
      {/* Deliverables section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-brand-600 uppercase tracking-wide mb-3">Generate in one click</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              From regulatory update to usable deliverable
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built for compliance, risk, PMO, change, governance, operations, and board support teams at UK financial services firms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {DELIVERABLES.map((d) => (
              <div key={d.title} className={`rounded-2xl border p-6 ${d.colour}`}>
                <div className="text-3xl mb-3">{d.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{d.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{d.description}</p>
              </div>
            ))}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 flex flex-col items-center justify-center text-center">
              <div className="text-3xl mb-3">📄</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Export PDF</h3>
              <p className="text-gray-600 text-sm">Print-ready view of any intelligence item or generated deliverable.</p>
            </div>
          </div>

          <div className="card p-6 bg-brand-50 border-brand-200 text-center">
            <p className="text-sm text-brand-700 mb-1">
              Every deliverable includes <strong>source links</strong>, <strong>rationale</strong>, and a <strong>confidence note</strong> — no black box.
            </p>
            <p className="text-xs text-brand-600">Facts come from the source. Actions are clearly labelled as AI-suggested and should be reviewed by your team.</p>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How it works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 bg-brand-700 text-white rounded-2xl flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sources */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Sources monitored daily</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['FCA', 'PRA', 'Bank of England', 'ICO', 'HM Treasury', 'Companies House'].map((s) => (
              <span key={s} className="px-4 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm font-medium text-gray-700">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
