/**
 * Seed script for firm_classifications table.
 *
 * Run AFTER migration-006.sql has been applied:
 *   npx tsx lib/db/seed-firm-classifications.ts
 *
 * Safe to re-run: uses upsert on slug.
 */

import { createAdminClient } from './client'

const SEED_CLASSIFICATIONS = [
  {
    slug: 'small_accountancy_firm',
    name: 'Small Accountancy Firm',
    description:
      'Small and mid-size accountancy practices providing audit, tax, VAT returns, payroll, and bookkeeping services to business clients. Many are regulated by professional bodies (ICAEW, ACCA) and carry AML obligations.',
    services: [
      'audit and assurance',
      'tax advisory',
      'VAT returns',
      'payroll processing',
      'bookkeeping',
      'company secretarial',
      'anti-money laundering supervision',
    ],
    regulators: ['HM Treasury', 'ICO', 'Companies House'],
    obligations: [
      'Money Laundering Regulations 2017 (MLR17)',
      'GDPR / UK GDPR',
      'ICAEW / ACCA professional standards',
      'Companies Act 2006',
      'Making Tax Digital (HMRC)',
      'Bribery Act 2010',
    ],
  },
  {
    slug: 'car_dealership_finance',
    name: 'Car Dealership Offering Finance',
    description:
      'Motor vehicle dealers who offer hire-purchase (HP) or personal contract purchase (PCP) finance to retail customers, either as FCA-authorised credit brokers or lenders. Subject to Consumer Duty, FCA conduct rules, and ASA advertising standards.',
    services: [
      'motor vehicle retail',
      'hire purchase (HP)',
      'personal contract purchase (PCP)',
      'credit brokerage',
      'GAP insurance intermediation',
      'vehicle servicing finance',
    ],
    regulators: ['FCA', 'FOS', 'FSCS', 'ASA', 'ICO', 'Companies House'],
    obligations: [
      'Consumer Duty (FCA PS22/9)',
      'Consumer Credit Act 1974',
      'FCA CONC sourcebook',
      'Financial Promotions Order 2005',
      'UK GDPR / Data Protection Act 2018',
      'Equality Act 2010',
      'Motor Finance Discretionary Commission Arrangements (FCA review)',
      'ASA CAP Code (advertising standards)',
    ],
  },
  {
    slug: 'ifa',
    name: 'Independent Financial Adviser (IFA)',
    description:
      'Retail investment advice firms providing whole-of-market investment, pension, protection, and mortgage advice to individuals. Directly authorised or network members. Subject to full FCA COBS conduct standards and Consumer Duty.',
    services: [
      'investment advice',
      'pension advice',
      'protection advice (life, critical illness, income protection)',
      'mortgage advice',
      'inheritance tax and estate planning',
      'long-term care advice',
    ],
    regulators: ['FCA', 'FOS', 'FSCS', 'TPR', 'ICO'],
    obligations: [
      'Consumer Duty (FCA PS22/9)',
      'Senior Managers and Certification Regime (SMCR)',
      'MiFID II / UK MiFIR',
      'FCA COBS sourcebook',
      'Retail Distribution Review (RDR) — adviser charging',
      'Consumer Composite Investments (CCIs) regime',
      'Pension Advice Allowance rules',
      'UK GDPR / Data Protection Act 2018',
      'Anti-Money Laundering (MLR17)',
      'Sustainable Finance Disclosure requirements',
    ],
  },
  {
    slug: 'high_street_lender',
    name: 'High-Street Lender / Credit Union',
    description:
      'Small community-based lenders, credit unions, and local building societies providing personal loans, overdrafts, and savings products to retail customers. Subject to prudential oversight alongside FCA conduct rules.',
    services: [
      'personal loans',
      'overdraft facilities',
      'savings accounts',
      'current accounts',
      'community finance',
      'affordable credit',
    ],
    regulators: ['FCA', 'PRA', 'FOS', 'FSCS', 'ICO', 'Companies House'],
    obligations: [
      'Consumer Duty (FCA PS22/9)',
      'Consumer Credit Act 1974',
      'FCA CONC sourcebook',
      'FCA BCOBS (banking conduct of business)',
      'Prudential sourcebook for Banks (BIPRU / CRD)',
      'Senior Managers and Certification Regime (SMCR)',
      'UK GDPR / Data Protection Act 2018',
      'Anti-Money Laundering (MLR17)',
      'Financial Inclusion commitments',
      'Breathing Space / statutory debt management',
    ],
  },
  {
    slug: 'mortgage_broker',
    name: 'Residential Mortgage Broker',
    description:
      'FCA-authorised firms providing whole-of-market or restricted mortgage advice and arranging to retail and buy-to-let customers. Includes directly authorised firms and appointed representatives of mortgage networks.',
    services: [
      'residential mortgage advice',
      'buy-to-let mortgage advice',
      'mortgage protection insurance',
      'equity release advice',
      'second charge mortgage advice',
      'credit brokerage',
    ],
    regulators: ['FCA', 'FOS', 'FSCS', 'ICO', 'Companies House'],
    obligations: [
      'Consumer Duty (FCA PS22/9)',
      'FCA MCOB sourcebook',
      'Mortgage Credit Directive (UK onshored)',
      'Responsible Lending rules (affordability assessment)',
      'Senior Managers and Certification Regime (SMCR)',
      'Financial Promotions Order 2005',
      'UK GDPR / Data Protection Act 2018',
      'Anti-Money Laundering (MLR17)',
      'Vulnerable Customers guidance (FCA FG21/1)',
      'Consumer Credit Act 1974 (second charge)',
    ],
  },
]

async function seed() {
  const db = createAdminClient()
  console.log(`[seed] Upserting ${SEED_CLASSIFICATIONS.length} firm classifications…`)

  const { data, error } = await db
    .from('firm_classifications')
    .upsert(SEED_CLASSIFICATIONS, { onConflict: 'slug' })
    .select('slug, name')

  if (error) {
    console.error('[seed] Error:', error.message)
    process.exit(1)
  }

  console.log('[seed] Done:')
  ;(data ?? []).forEach((row: { slug: string; name: string }) =>
    console.log(`  ✓ ${row.slug} — ${row.name}`)
  )
}

seed().catch((err) => {
  console.error('[seed] Unexpected error:', err)
  process.exit(1)
})
