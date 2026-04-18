/**
 * Source Registry
 *
 * Single source of truth for all ingested sources — their display metadata,
 * category, and regulated domains.
 *
 * source_category:
 *   core_fs          — primary UK FS regulators, government finance
 *   adjacent         — quasi-regulatory bodies closely connected to FS
 *   sector_specific  — regulators with domain-specific FS overlap
 *
 * regulated_domain: the regulatory/legal domain each source primarily covers.
 * One source may cover multiple domains.
 */

export type SourceCategory = 'core_fs' | 'adjacent' | 'sector_specific'

export type RegulatedDomain =
  | 'banking'
  | 'insurance'
  | 'investments'
  | 'payments'
  | 'pensions'
  | 'consumer_credit'
  | 'redress'
  | 'compensation'
  | 'data_privacy'
  | 'advertising'
  | 'gambling'
  | 'telecoms'
  | 'company_law'
  | 'government_finance'
  | 'general_fs'

export interface SourceMeta {
  display_name: string
  source_category: SourceCategory
  regulated_domains: RegulatedDomain[]
  description: string
  website: string
}

export const SOURCE_REGISTRY: Record<string, SourceMeta> = {
  // ── Core Financial Services ─────────────────────────────────────────────
  'FCA': {
    display_name: 'FCA',
    source_category: 'core_fs',
    regulated_domains: ['banking', 'investments', 'consumer_credit', 'insurance', 'general_fs'],
    description: 'Financial Conduct Authority — conduct regulation for ~50,000 firms',
    website: 'https://www.fca.org.uk',
  },
  'PRA': {
    display_name: 'PRA',
    source_category: 'core_fs',
    regulated_domains: ['banking', 'insurance'],
    description: 'Prudential Regulation Authority — systemic safety of banks and insurers',
    website: 'https://www.bankofengland.co.uk/prudential-regulation',
  },
  'Bank of England': {
    display_name: 'Bank of England',
    source_category: 'core_fs',
    regulated_domains: ['banking', 'general_fs'],
    description: 'Monetary policy, financial stability, and macroprudential oversight',
    website: 'https://www.bankofengland.co.uk',
  },
  'HM Treasury': {
    display_name: 'HM Treasury',
    source_category: 'core_fs',
    regulated_domains: ['government_finance', 'general_fs'],
    description: 'Government finance ministry — sets FS legislative framework',
    website: 'https://www.gov.uk/government/organisations/hm-treasury',
  },
  'PSR': {
    display_name: 'PSR',
    source_category: 'core_fs',
    regulated_domains: ['payments'],
    description: 'Payment Systems Regulator — oversight of UK payment systems',
    website: 'https://www.psr.org.uk',
  },
  // ── Adjacent FS Bodies ───────────────────────────────────────────────────
  'FOS': {
    display_name: 'Financial Ombudsman',
    source_category: 'adjacent',
    regulated_domains: ['redress', 'consumer_credit', 'general_fs'],
    description: 'Financial Ombudsman Service — consumer complaints and redress',
    website: 'https://www.financial-ombudsman.org.uk',
  },
  'FSCS': {
    display_name: 'FSCS',
    source_category: 'adjacent',
    regulated_domains: ['compensation', 'banking', 'investments'],
    description: 'Financial Services Compensation Scheme — last-resort claimant protection',
    website: 'https://www.fscs.org.uk',
  },
  'ICO': {
    display_name: 'ICO',
    source_category: 'adjacent',
    regulated_domains: ['data_privacy'],
    description: 'Information Commissioner\'s Office — data protection and privacy',
    website: 'https://ico.org.uk',
  },
  'Companies House': {
    display_name: 'Companies House',
    source_category: 'adjacent',
    regulated_domains: ['company_law'],
    description: 'UK company registration and corporate governance disclosures',
    website: 'https://www.gov.uk/government/organisations/companies-house',
  },
  // ── Sector-Specific ─────────────────────────────────────────────────────
  'TPR': {
    display_name: 'The Pensions Regulator',
    source_category: 'sector_specific',
    regulated_domains: ['pensions'],
    description: 'The Pensions Regulator — workplace pensions and trustee guidance',
    website: 'https://www.thepensionsregulator.gov.uk',
  },
  'ASA': {
    display_name: 'ASA',
    source_category: 'sector_specific',
    regulated_domains: ['advertising'],
    description: 'Advertising Standards Authority — advertising rules and rulings',
    website: 'https://www.asa.org.uk',
  },
  'Ofcom': {
    display_name: 'Ofcom',
    source_category: 'sector_specific',
    regulated_domains: ['telecoms'],
    description: 'Ofcom — communications services, broadband, mobile, and TV',
    website: 'https://www.ofcom.org.uk',
  },
  'Gambling Commission': {
    display_name: 'Gambling Commission',
    source_category: 'sector_specific',
    regulated_domains: ['gambling'],
    description: 'Gambling Commission — gambling regulation and licensing',
    website: 'https://www.gamblingcommission.gov.uk',
  },
}

// ── Derived helpers ──────────────────────────────────────────────────────────

/** All registered source names */
export const ALL_SOURCE_NAMES = Object.keys(SOURCE_REGISTRY)

/** Source names by category */
export function getSourcesByCategory(category: SourceCategory): string[] {
  return Object.entries(SOURCE_REGISTRY)
    .filter(([, meta]) => meta.source_category === category)
    .map(([name]) => name)
}

export const CORE_FS_SOURCES = getSourcesByCategory('core_fs')
export const ADJACENT_SOURCES = getSourcesByCategory('adjacent')
export const SECTOR_SPECIFIC_SOURCES = getSourcesByCategory('sector_specific')

/** Source group label map */
export const SOURCE_CATEGORY_LABELS: Record<SourceCategory, string> = {
  core_fs: 'Core FS',
  adjacent: 'Adjacent',
  sector_specific: 'Sector',
}

/** Get metadata for a source — safe fallback if not registered */
export function getSourceMeta(name: string): SourceMeta | undefined {
  return SOURCE_REGISTRY[name]
}
