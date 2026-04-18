/**
 * Regulatory Roadmap — Seed Data
 *
 * Manually curated timeline of major UK regulatory milestones.
 * This is the Phase 1 seed layer: static TypeScript config, no CMS.
 *
 * Future direction:
 *   - DB-backed model linked to intelligence_items
 *   - Editorial workflow for milestone curation
 *   - Linked source publications, commentary, and generated deliverables
 *   - Firm-specific portfolio tracking against these milestones
 *
 * Data quality notes:
 *   - 'live' = already in effect (past date, confirmed)
 *   - 'known' = confirmed future date or confirmed upcoming event
 *   - 'expected' = anticipated, not yet formally confirmed
 *   - 'important' = high-impact item meriting special prominence
 *   - 'delayed' = previously expected, slipped or paused
 *
 * Last seeded: April 2026
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type MilestoneStatus = 'live' | 'known' | 'expected' | 'important' | 'delayed'

export interface RegulatoryMilestone {
  id: string
  title: string
  /** 1–2 sentence plain-English description */
  description: string
  theme_id: string
  status: MilestoneStatus
  /** Display quarter, e.g. "Q3 2023", "Q1 2026" */
  quarter: string
  year: number
  /** Specific month (1–12) if known; used for ordering within a quarter */
  month?: number
  /** Primary regulator(s) responsible */
  regulator: string
  /** Longer detail for the expanded panel */
  detail?: string
  /** Link to official publication or announcement */
  source_url?: string
  /** Additional keyword tags */
  tags?: string[]
}

export interface RoadmapTheme {
  id: string
  title: string
  /** Short label for pills and badges */
  short: string
  description: string
  /** Tailwind color accent classes — bg, text, border */
  color: {
    bg: string
    text: string
    border: string
    dot: string
  }
  icon: string
}

// ── Themes ───────────────────────────────────────────────────────────────────

export const ROADMAP_THEMES: RoadmapTheme[] = [
  {
    id: 'consumer-duty',
    title: 'Consumer Duty',
    short: 'Consumer Duty',
    description: 'FCA\'s cross-cutting principle requiring firms to deliver good outcomes for retail customers.',
    color: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500' },
    icon: '👤',
  },
  {
    id: 'operational-resilience',
    title: 'Operational Resilience',
    short: 'Op Resilience',
    description: 'FCA/PRA framework requiring firms to identify important business services and set impact tolerances.',
    color: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500' },
    icon: '🛡️',
  },
  {
    id: 'app-fraud',
    title: 'APP Fraud Reimbursement',
    short: 'APP Fraud',
    description: 'PSR\'s mandatory reimbursement scheme for authorised push payment fraud victims.',
    color: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', dot: 'bg-red-500' },
    icon: '🔐',
  },
  {
    id: 'motor-finance',
    title: 'Motor Finance',
    short: 'Motor Finance',
    description: 'FCA investigation into historical discretionary commission arrangements (DCAs) and potential mass redress.',
    color: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
    icon: '🚗',
  },
  {
    id: 'bnpl',
    title: 'BNPL Regulation',
    short: 'BNPL',
    description: 'Government and FCA plans to bring Buy Now, Pay Later products into regulated credit perimeter.',
    color: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', dot: 'bg-green-500' },
    icon: '💳',
  },
  {
    id: 'access-to-cash',
    title: 'Access to Cash',
    short: 'Access to Cash',
    description: 'FCA powers under FSMA 2023 to designate and enforce cash access requirements for banks and building societies.',
    color: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200', dot: 'bg-teal-500' },
    icon: '💵',
  },
  {
    id: 'ai-digital',
    title: 'AI & Digital',
    short: 'AI / Digital',
    description: 'UK AI regulation landscape, digital identity, and use of AI/ML in FS — regulatory frameworks evolving rapidly.',
    color: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500' },
    icon: '🤖',
  },
  {
    id: 'third-party-risk',
    title: 'Third-Party Risk & Resilience',
    short: 'Third-Party Risk',
    description: 'Critical Third Party (CTP) regime for systemic outsourcing providers, plus DORA (EU) implications for UK firms.',
    color: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-500' },
    icon: '🔗',
  },
]

// Helper to look up a theme
export function getTheme(themeId: string): RoadmapTheme | undefined {
  return ROADMAP_THEMES.find((t) => t.id === themeId)
}

// ── Milestones ────────────────────────────────────────────────────────────────

export const ROADMAP_MILESTONES: RegulatoryMilestone[] = [

  // ────────────────────────────────────────────────────────────────────────────
  // Consumer Duty
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'cd-ps-live',
    title: 'Consumer Duty comes into force — new and existing open products',
    description: 'FCA Consumer Duty (PS22/9) effective for all new and existing open products and services.',
    theme_id: 'consumer-duty',
    status: 'live',
    quarter: 'Q3 2023',
    year: 2023,
    month: 7,
    regulator: 'FCA',
    detail: 'The Consumer Duty sets a higher standard of consumer protection in retail financial markets. It introduced a new Consumer Principle (Principle 12) and cross-cutting rules. Firms must deliver good outcomes across products and services, price and value, consumer understanding, and consumer support.',
    source_url: 'https://www.fca.org.uk/publications/policy-statements/ps22-9-a-new-consumer-duty',
    tags: ['consumer duty', 'retail', 'outcomes'],
  },
  {
    id: 'cd-legacy-live',
    title: 'Consumer Duty extended to closed products and legacy book',
    description: 'Compliance deadline for closed products and legacy book — the full Consumer Duty now applies to all retail business.',
    theme_id: 'consumer-duty',
    status: 'live',
    quarter: 'Q3 2024',
    year: 2024,
    month: 7,
    regulator: 'FCA',
    detail: 'Firms that had open-ended extensions on legacy products were required to bring those products into full Consumer Duty compliance by 31 July 2024.',
    source_url: 'https://www.fca.org.uk/publications/finalised-guidance/fg24-1-implementation-consumer-duty-closed-products-services',
    tags: ['consumer duty', 'legacy', 'closed products'],
  },
  {
    id: 'cd-review-2025',
    title: 'FCA publishes Consumer Duty supervisory review findings',
    description: 'FCA to publish sector-specific findings from its Consumer Duty supervisory programme, highlighting implementation gaps.',
    theme_id: 'consumer-duty',
    status: 'expected',
    quarter: 'H1 2025',
    year: 2025,
    regulator: 'FCA',
    detail: 'FCA has committed to sharing good and poor practice from its thematic supervisory work. Firms should expect scrutiny of price and value, fair value assessments, and consumer support metrics.',
    tags: ['consumer duty', 'supervisory', 'thematic review'],
  },
  {
    id: 'cd-annual-report',
    title: 'Firms\' second Consumer Duty annual board reports due',
    description: 'FCA requires firms to produce an annual Consumer Duty board report assessing outcomes delivery.',
    theme_id: 'consumer-duty',
    status: 'known',
    quarter: 'Q3 2025',
    year: 2025,
    month: 7,
    regulator: 'FCA',
    detail: 'Firms must produce an annual board report each July assessing whether they are delivering good consumer outcomes. FCA will scrutinise these in supervisory assessments.',
    tags: ['consumer duty', 'governance', 'board report'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Operational Resilience
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'opres-policy-live',
    title: 'Operational Resilience framework takes effect',
    description: 'FCA and PRA operational resilience policy (PS21/3 / SS1/21) became effective. Firms must identify important business services and set impact tolerances.',
    theme_id: 'operational-resilience',
    status: 'live',
    quarter: 'Q2 2022',
    year: 2022,
    month: 3,
    regulator: 'FCA / PRA',
    detail: 'Firms were required to identify important business services (IBS), set impact tolerances, and begin mapping and testing. The 3-year window to demonstrate they can remain within tolerances during disruption runs to March 2025.',
    source_url: 'https://www.fca.org.uk/publications/policy-statements/ps21-3-building-operational-resilience',
    tags: ['operational resilience', 'IBS', 'impact tolerance'],
  },
  {
    id: 'opres-tolerances-deadline',
    title: 'Firms must demonstrate they can remain within impact tolerances',
    description: 'Deadline for firms to show they can remain within impact tolerances for all important business services during severe but plausible disruption scenarios.',
    theme_id: 'operational-resilience',
    status: 'live',
    quarter: 'Q1 2025',
    year: 2025,
    month: 3,
    regulator: 'FCA / PRA',
    detail: 'By 31 March 2025, firms must have completed mapping, scenario testing, and demonstrated ability to remain within impact tolerances. FCA/PRA supervisory assessments will now test firms against this standard.',
    tags: ['operational resilience', 'impact tolerance', 'deadline'],
  },
  {
    id: 'opres-supervisory',
    title: 'Ongoing FCA/PRA supervisory focus on operational resilience',
    description: 'FCA and PRA continue deep-dive supervisory work on operational resilience and third-party dependency management.',
    theme_id: 'operational-resilience',
    status: 'important',
    quarter: 'H2 2025',
    year: 2025,
    regulator: 'FCA / PRA',
    detail: 'Post-deadline, regulators are conducting firm-level assessments and expect documented evidence of IBS mapping, testing results, and remediation plans where tolerances cannot yet be met.',
    tags: ['operational resilience', 'supervisory', 'third-party'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // APP Fraud Reimbursement
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'app-scheme-live',
    title: 'Mandatory APP fraud reimbursement scheme live',
    description: 'PSR\'s mandatory reimbursement scheme for authorised push payment (APP) fraud victims takes effect. Sending and receiving firms bear liability.',
    theme_id: 'app-fraud',
    status: 'live',
    quarter: 'Q4 2024',
    year: 2024,
    month: 10,
    regulator: 'PSR',
    detail: 'From 7 October 2024, banks and PSPs must reimburse APP fraud victims within 5 business days. Maximum claim amount initially set at £85,000 (later revised). Liability shared between sending and receiving firms. Pay.UK Faster Payments scheme delivers the framework.',
    source_url: 'https://www.psr.org.uk/our-work/app-scams/',
    tags: ['APP fraud', 'reimbursement', 'PSR', 'faster payments'],
  },
  {
    id: 'app-review-2025',
    title: 'PSR first-year review of APP reimbursement scheme',
    description: 'PSR to publish initial findings on the impact and operation of the mandatory reimbursement scheme.',
    theme_id: 'app-fraud',
    status: 'expected',
    quarter: 'H2 2025',
    year: 2025,
    regulator: 'PSR',
    detail: 'PSR committed to review scheme operation within the first year. This will assess claim volumes, reimbursement rates, cost distribution, and whether the cap is set at the right level.',
    tags: ['APP fraud', 'PSR review', 'reimbursement cap'],
  },
  {
    id: 'app-reporting',
    title: 'PSR APP fraud data reporting obligations',
    description: 'Banks required to publish annual APP fraud reimbursement data per PSR requirements, enabling consumer comparisons.',
    theme_id: 'app-fraud',
    status: 'known',
    quarter: 'Q1 2025',
    year: 2025,
    month: 1,
    regulator: 'PSR',
    detail: 'PSR requires covered firms to publish data on APP scam claims received, reimbursed, and declined, enabling consumers and media to compare firm performance.',
    tags: ['APP fraud', 'reporting', 'transparency'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Motor Finance
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'mf-dca-ban',
    title: 'FCA bans discretionary commission arrangements (DCAs)',
    description: 'FCA banned all motor finance DCAs — arrangements where brokers could set interest rates and earn higher commission for doing so.',
    theme_id: 'motor-finance',
    status: 'live',
    quarter: 'Q1 2021',
    year: 2021,
    month: 1,
    regulator: 'FCA',
    detail: 'From 28 January 2021, motor finance lenders were banned from offering broker commission arrangements that varied with the interest rate charged to the customer (DCAs). The ban followed FCA market study findings of widespread consumer harm.',
    source_url: 'https://www.fca.org.uk/publications/policy-statements/ps19-29-motor-finance-discretionary-commission-models-consumer-credit-final-rules',
    tags: ['motor finance', 'DCA', 'commission', 'ban'],
  },
  {
    id: 'mf-complaints-pause',
    title: 'FCA pauses motor finance historical DCA complaint handling',
    description: 'FCA issues guidance pausing firms\' obligation to provide a final response to DCA-related complaints while it considers whether to establish a redress scheme.',
    theme_id: 'motor-finance',
    status: 'live',
    quarter: 'Q1 2024',
    year: 2024,
    month: 1,
    regulator: 'FCA',
    detail: 'FCA paused complaint handling timelines to allow it to investigate the scale of potential historical harm from DCAs. The pause was extended multiple times through 2024.',
    source_url: 'https://www.fca.org.uk/news/statements/update-fca-review-historical-motor-finance-commission-arrangements',
    tags: ['motor finance', 'DCA', 'complaints', 'redress'],
  },
  {
    id: 'mf-court-ruling',
    title: 'Supreme Court / Court of Appeal judgment on DCA liability',
    description: 'Key court ruling on whether lenders owe a duty of disclosure to consumers about DCA commission arrangements — central to potential mass redress.',
    theme_id: 'motor-finance',
    status: 'important',
    quarter: 'H1 2025',
    year: 2025,
    regulator: 'FCA / Courts',
    detail: 'In October 2024 the Court of Appeal found that non-disclosed DCAs were unlawful. The Supreme Court appeal was set for April 2025. The outcome will determine whether lenders must establish mass redress schemes potentially costing £30bn+.',
    tags: ['motor finance', 'DCA', 'redress scheme', 'Supreme Court'],
  },
  {
    id: 'mf-redress-outcome',
    title: 'FCA decision on motor finance redress scheme',
    description: 'Following court rulings, FCA to decide whether to establish an industry-wide redress scheme for historical DCA motor finance customers.',
    theme_id: 'motor-finance',
    status: 'expected',
    quarter: 'H2 2025',
    year: 2025,
    regulator: 'FCA',
    detail: 'FCA has said it will act quickly once court proceedings are concluded. A redress scheme similar to PPI would require significant operational build across major lenders.',
    tags: ['motor finance', 'redress scheme', 'FCA', 'DCA'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // BNPL Regulation
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'bnpl-consultation',
    title: 'HM Treasury consults on bringing BNPL into regulated perimeter',
    description: 'Government consultation on extending consumer credit regulation to Buy Now, Pay Later products, requiring FCA authorisation and FCA-approved credit agreements.',
    theme_id: 'bnpl',
    status: 'live',
    quarter: 'Q2 2023',
    year: 2023,
    month: 6,
    regulator: 'HM Treasury',
    detail: 'The government committed to regulation following the Woolard Review findings. Delayed from original 2022 plan. Consultation sought views on scope, exemptions, and transition arrangements.',
    source_url: 'https://www.gov.uk/government/consultations/buy-now-pay-later-bespoke-regulatory-framework',
    tags: ['BNPL', 'consumer credit', 'HM Treasury'],
  },
  {
    id: 'bnpl-fca-rules',
    title: 'FCA BNPL rules consultation',
    description: 'FCA expected to consult on specific BNPL rules following legislative change — covering affordability, promotions, and complaints.',
    theme_id: 'bnpl',
    status: 'expected',
    quarter: 'H2 2025',
    year: 2025,
    regulator: 'FCA',
    detail: 'Once enabling legislation is enacted, FCA will consult on detailed conduct rules for BNPL providers including creditworthiness assessments, financial promotions, Section 75 liability, and FOS access.',
    tags: ['BNPL', 'FCA', 'affordability', 'financial promotion'],
  },
  {
    id: 'bnpl-live',
    title: 'BNPL regulation in force',
    description: 'BNPL products formally regulated under Consumer Credit Act framework with FCA oversight — providers require authorisation.',
    theme_id: 'bnpl',
    status: 'expected',
    quarter: 'H1 2026',
    year: 2026,
    regulator: 'FCA / HM Treasury',
    detail: 'Subject to legislative progress and FCA consultation. Major BNPL providers (Klarna, Clearpay, Laybuy etc) will require FCA authorisation. Credit agreements must comply with CCA requirements.',
    tags: ['BNPL', 'regulation live', 'authorisation'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Access to Cash
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'atc-fsma-powers',
    title: 'FCA gains cash access powers under FSMA 2023',
    description: 'Financial Services and Markets Act 2023 grants FCA powers to designate banks and building societies with cash access obligations.',
    theme_id: 'access-to-cash',
    status: 'live',
    quarter: 'Q3 2023',
    year: 2023,
    month: 8,
    regulator: 'FCA / HM Treasury',
    detail: 'FSMA 2023 gave FCA the power to require designated firms to provide access to cash facilities and to designate certain locations as requiring ATM or counter access.',
    source_url: 'https://www.fca.org.uk/firms/financial-crime/access-to-cash',
    tags: ['access to cash', 'FSMA 2023', 'FCA powers'],
  },
  {
    id: 'atc-policy-statement',
    title: 'FCA cash access policy statement published',
    description: 'FCA publishes final rules requiring designated firms to provide reasonable cash access facilities in areas at risk of significant decline.',
    theme_id: 'access-to-cash',
    status: 'live',
    quarter: 'Q3 2024',
    year: 2024,
    month: 9,
    regulator: 'FCA',
    detail: 'FCA final rules require banks and building societies to assess local cash access needs and work with LINK to plug gaps. Firms must respond to community requests and FCA can direct provision.',
    source_url: 'https://www.fca.org.uk/publications/policy-statements/ps24-8-access-to-cash',
    tags: ['access to cash', 'FCA rules', 'LINK', 'ATM'],
  },
  {
    id: 'atc-obligations-live',
    title: 'Cash access obligations in effect — firms subject to FCA supervision',
    description: 'Designated firms now subject to FCA supervisory oversight on cash access provision and community requests.',
    theme_id: 'access-to-cash',
    status: 'live',
    quarter: 'Q4 2024',
    year: 2024,
    month: 11,
    regulator: 'FCA',
    detail: 'Firms are required to respond to formal community cash access requests, assess local need, and cooperate with LINK\'s cash access monitoring. FCA can take enforcement action for persistent gaps.',
    tags: ['access to cash', 'supervision', 'community request'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // AI & Digital
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'ai-wp-2023',
    title: 'UK Government AI Regulation White Paper',
    description: 'Government sets out pro-innovation AI regulation approach. Existing sector regulators (including FCA) to apply principles within their domains rather than creating a single AI regulator.',
    theme_id: 'ai-digital',
    status: 'live',
    quarter: 'Q1 2023',
    year: 2023,
    month: 3,
    regulator: 'DSIT / Government',
    detail: 'The White Paper set out five cross-sector AI regulation principles: safety, transparency, fairness, accountability, and contestability. FCA, PRA, and CMA will apply these in their own regulatory frameworks.',
    source_url: 'https://www.gov.uk/government/publications/ai-regulation-a-pro-innovation-approach',
    tags: ['AI', 'regulation', 'white paper', 'pro-innovation'],
  },
  {
    id: 'ai-fca-discussion',
    title: 'FCA AI Discussion Paper (DP5/22 / DP4/22)',
    description: 'FCA sets out expectations for firms using AI/ML and seeks views on how existing rules apply.',
    theme_id: 'ai-digital',
    status: 'live',
    quarter: 'Q4 2022',
    year: 2022,
    month: 10,
    regulator: 'FCA',
    detail: 'FCA/PRA/BoE published a joint Discussion Paper on AI in FS, covering explainability, model risk, governance, and third-party AI dependencies. Firms responded in early 2023.',
    source_url: 'https://www.fca.org.uk/publications/discussion-papers/dp5-22-artificial-intelligence-and-machine-learning',
    tags: ['AI', 'ML', 'model risk', 'FCA'],
  },
  {
    id: 'digital-identity-bill',
    title: 'Data (Use and Access) Act — digital identity provisions',
    description: 'The Data (Use and Access) Act 2025 creates a framework for digital identity products, including a trust register and certified scheme requirements.',
    theme_id: 'ai-digital',
    status: 'live',
    quarter: 'Q2 2025',
    year: 2025,
    month: 6,
    regulator: 'DSIT / Government',
    detail: 'The Act establishes a voluntary framework for digital identity services, with a register of certified providers, trust marks, and liability provisions. FS firms using digital identity for KYC/AML need to understand scheme requirements.',
    tags: ['digital identity', 'Data Act', 'KYC', 'AML'],
  },
  {
    id: 'ai-fca-update',
    title: 'FCA publishes updated AI/ML guidance for FS firms',
    description: 'FCA expected to publish updated guidance on responsible AI use, model governance, and accountability for automated decision-making.',
    theme_id: 'ai-digital',
    status: 'expected',
    quarter: 'H2 2025',
    year: 2025,
    regulator: 'FCA',
    detail: 'Following the AI Discussion Paper responses and the Government\'s AI Action Plan, FCA is expected to clarify how existing rules (governance, fairness, explainability under Consumer Duty) apply to algorithmic systems.',
    tags: ['AI', 'model governance', 'FCA guidance', 'algorithmic'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Third-Party Risk / Resilience
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'ctp-consultation',
    title: 'FCA/PRA/BoE consult on Critical Third Party (CTP) regime',
    description: 'Joint consultation on a new framework giving FCA, PRA, and BoE powers to directly oversee the most systemically important outsourcing and technology providers to the FS sector.',
    theme_id: 'third-party-risk',
    status: 'live',
    quarter: 'Q4 2022',
    year: 2022,
    month: 11,
    regulator: 'FCA / PRA / Bank of England',
    detail: 'CP22/6 set out a proposed regime where HM Treasury would designate certain providers as CTPs, and the regulators could then impose requirements directly on those providers rather than solely through firms.',
    source_url: 'https://www.fca.org.uk/publications/consultation-papers/cp22-6-operational-resilience-critical-third-parties',
    tags: ['CTP', 'operational resilience', 'outsourcing', 'third party'],
  },
  {
    id: 'ctp-regime-live',
    title: 'Critical Third Party (CTP) regime comes into force',
    description: 'CTP designation powers effective. HM Treasury begins process of designating the first tranche of systemically important technology and outsourcing providers.',
    theme_id: 'third-party-risk',
    status: 'live',
    quarter: 'Q1 2025',
    year: 2025,
    month: 1,
    regulator: 'FCA / PRA / Bank of England',
    detail: 'The regime was enabled by FSMA 2023. From January 2025, HM Treasury has powers to designate CTPs and regulators can issue requirements, information requests, and conduct inspections of designated CTPs.',
    tags: ['CTP', 'designation', 'FSMA 2023', 'operational resilience'],
  },
  {
    id: 'ctp-first-designations',
    title: 'First CTP designations announced',
    description: 'HM Treasury expected to publish first list of entities designated as Critical Third Parties under the FSMA 2023 framework.',
    theme_id: 'third-party-risk',
    status: 'expected',
    quarter: 'H2 2025',
    year: 2025,
    regulator: 'HM Treasury / FCA / PRA',
    detail: 'Major cloud providers (AWS, Microsoft Azure, Google Cloud), payment processors, and data vendors are likely first-wave candidates. Designated CTPs will face direct regulatory obligations including resilience testing and incident reporting.',
    tags: ['CTP', 'cloud', 'designation', 'AWS', 'Azure'],
  },
  {
    id: 'dora-uk-firms',
    title: 'EU DORA — implications for UK firms with EU operations',
    description: 'EU Digital Operational Resilience Act (DORA) applies to EU entities, including UK firms\' EU subsidiaries and passported operations.',
    theme_id: 'third-party-risk',
    status: 'live',
    quarter: 'Q1 2025',
    year: 2025,
    month: 1,
    regulator: 'EU / ESAs',
    detail: 'From 17 January 2025, EU-based financial entities (including EU subsidiaries of UK firms) must comply with DORA. Requirements include ICT risk management frameworks, incident reporting, resilience testing, and third-party risk management for ICT providers.',
    tags: ['DORA', 'EU', 'ICT risk', 'UK subsidiaries'],
  },
]

// ── Derived helpers ──────────────────────────────────────────────────────────

/** All unique years in the milestone set, sorted ascending */
export const MILESTONE_YEARS: number[] = Array.from(
  new Set(ROADMAP_MILESTONES.map((m) => m.year))
).sort((a, b) => a - b)

/** Get milestones for a specific theme */
export function getMilestonesByTheme(themeId: string): RegulatoryMilestone[] {
  return ROADMAP_MILESTONES.filter((m) => m.theme_id === themeId)
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return (a.month ?? 6) - (b.month ?? 6)
    })
}

/** Get milestones for a specific year */
export function getMilestonesByYear(year: number): RegulatoryMilestone[] {
  return ROADMAP_MILESTONES.filter((m) => m.year === year)
    .sort((a, b) => (a.month ?? 6) - (b.month ?? 6))
}
