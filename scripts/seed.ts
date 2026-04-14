#!/usr/bin/env tsx
/**
 * Database seeding script for BankScope Intelligence.
 * Creates sample intelligence items for development/demo purposes.
 * Usage: npm run seed
 */

import 'dotenv/config'
import { createAdminClient } from '../lib/db/client'

const SAMPLE_ITEMS = [
  {
    source_id: 'seed-001-fca-consumer-duty',
    title: 'FCA publishes final guidance on Consumer Duty implementation for savings providers',
    source_name: 'FCA',
    source_type: 'regulator',
    content_type: 'publication',
    publish_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://www.fca.org.uk/publications',
    raw_excerpt:
      'The FCA has published finalised guidance on how savings providers should embed the Consumer Duty outcomes framework into their product governance arrangements, with particular focus on price and value assessments for cash ISA and easy access savings products.',
    ai_summary:
      'The FCA has issued final implementation guidance specifically for savings providers regarding Consumer Duty. The guidance focuses on product governance and requires savings firms to conduct formal price-and-value assessments for all retail savings products, including cash ISAs and easy access accounts. Firms should ensure their outcomes monitoring frameworks are in place and evidenced before the next supervisory cycle.',
    affected_audience: ['savings providers', 'banks', 'building societies'],
    priority_score: 8,
    urgency: 'high',
    category_tags: ['consumer duty', 'savings regulation', 'conduct risk', 'vulnerable customers'],
    suggested_next_step:
      'Review your Consumer Duty price-and-value assessment methodology for all savings products and ensure documented evidence is held for each product line.',
    confidence_status: 'ai-generated',
    is_processed: true,
  },
  {
    source_id: 'seed-002-pra-capital',
    title: 'PRA consults on updated capital requirements for non-systemic deposit takers',
    source_name: 'PRA',
    source_type: 'regulator',
    content_type: 'consultation',
    publish_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://www.bankofengland.co.uk/prudential-regulation',
    raw_excerpt:
      'The PRA is seeking views on proposed changes to Pillar 2A capital requirements for non-systemic deposit-taking institutions, including building societies and smaller banks, with responses due within 90 days.',
    ai_summary:
      'The PRA has opened a consultation on revised Pillar 2A capital requirements targeting smaller deposit takers — including building societies and regional banks — that are not classified as systemically important. The proposed changes would affect how firms calculate their individual capital guidance. The consultation window is 90 days.',
    affected_audience: ['banks', 'building societies', 'credit unions'],
    priority_score: 7,
    urgency: 'high',
    category_tags: ['capital requirements', 'stress testing', 'reporting'],
    suggested_next_step:
      'Review the consultation paper, assess the impact on your current Pillar 2A calculation, and prepare a response before the deadline.',
    confidence_status: 'ai-generated',
    is_processed: true,
  },
  {
    source_id: 'seed-003-boe-rates',
    title: 'Bank of England MPC holds Bank Rate at 4.75% — Governor signals gradual easing path',
    source_name: 'Bank of England',
    source_type: 'regulator',
    content_type: 'policy-statement',
    publish_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://www.bankofengland.co.uk/monetary-policy-summary',
    raw_excerpt:
      'The Monetary Policy Committee voted 7-2 to hold Bank Rate at 4.75%. The Governor indicated that while inflation is returning towards target, the Committee will move cautiously on rate reductions given persistent services inflation.',
    ai_summary:
      'The Bank of England MPC voted 7-2 to hold the base rate at 4.75%, with the Governor signalling a cautious approach to future cuts. Services inflation remains the key concern. For retail lenders and savings providers, this means the current deposit rate environment is likely to persist for at least another MPC cycle, with SVR and tracker mortgage rates also unchanged.',
    affected_audience: ['banks', 'building societies', 'savings providers', 'mortgage lenders'],
    priority_score: 6,
    urgency: 'medium',
    category_tags: ['interest rates', 'inflation', 'monetary policy', 'savings regulation'],
    suggested_next_step:
      'Update your rate scenario planning models and review any upcoming product repricing decisions in light of the hold decision.',
    confidence_status: 'ai-generated',
    is_processed: true,
  },
  {
    source_id: 'seed-004-ico-enforcement',
    title: 'ICO fines major lender £1.35m for unlawful use of customer data in credit decisioning',
    source_name: 'ICO',
    source_type: 'regulator',
    content_type: 'enforcement',
    publish_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/',
    raw_excerpt:
      'The Information Commissioner\'s Office has issued a £1.35 million penalty to a consumer lending firm following an investigation into unlawful use of third-party data in automated credit risk assessments, in breach of UK GDPR Article 22 requirements on automated decision-making.',
    ai_summary:
      'The ICO has fined a consumer lender £1.35 million for using third-party data in automated credit decisions without meeting UK GDPR Article 22 safeguards. The firm failed to provide adequate meaningful human review processes for automated credit decisions and had not obtained valid consent. This action signals increased ICO focus on automated decision-making in financial services.',
    affected_audience: ['personal loan lenders', 'specialist lenders', 'banks'],
    priority_score: 9,
    urgency: 'high',
    category_tags: ['data protection', 'enforcement', 'consumer credit', 'conduct risk'],
    suggested_next_step:
      'Urgently review your automated credit decisioning processes against UK GDPR Article 22 requirements and ensure meaningful human review safeguards are documented and operational.',
    confidence_status: 'ai-generated',
    is_processed: true,
  },
  {
    source_id: 'seed-005-hmt-access-cash',
    title: 'HM Treasury publishes call for evidence on access to cash infrastructure beyond 2025',
    source_name: 'HM Treasury',
    source_type: 'government',
    content_type: 'consultation',
    publish_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://www.gov.uk/government/publications',
    raw_excerpt:
      'The Treasury is gathering evidence on how the access to cash regime should evolve beyond the current framework, including the role of banking hubs, ATM networks, and shared banking services in supporting cash availability in underserved communities.',
    ai_summary:
      'HM Treasury is consulting on the future of the UK access-to-cash regime beyond 2025. The call for evidence covers banking hubs, ATM network sustainability, and shared banking services in rural and underserved areas. This will likely inform future regulation of branch closures and cashpoint provision for banks and building societies.',
    affected_audience: ['banks', 'building societies', 'credit unions'],
    priority_score: 5,
    urgency: 'medium',
    category_tags: ['access to cash', 'branch closures', 'financial inclusion'],
    suggested_next_step:
      'Consider submitting a response if your firm operates branches or ATMs in underserved areas, and monitor for resulting FCA/PSR regulatory developments.',
    confidence_status: 'ai-generated',
    is_processed: true,
  },
  {
    source_id: 'seed-006-fca-aml',
    title: 'FCA Dear CEO letter: financial crime controls in challenger banks and payment firms',
    source_name: 'FCA',
    source_type: 'regulator',
    content_type: 'publication',
    publish_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://www.fca.org.uk/publications',
    raw_excerpt:
      'The FCA has written to CEOs of challenger banks and payment institutions setting out expectations for financial crime controls, following a review that identified weaknesses in transaction monitoring, customer risk assessment, and Suspicious Activity Reporting processes.',
    ai_summary:
      'The FCA has issued a Dear CEO letter to challengers and payment firms flagging significant weaknesses found in financial crime controls during a supervisory review. Key concerns include inadequate transaction monitoring calibration, poor customer risk scoring, and delays in SARs filing. The FCA expects boards to review findings and provide written attestation of remediation plans.',
    affected_audience: ['banks', 'payment firms', 'specialist lenders'],
    priority_score: 9,
    urgency: 'critical',
    category_tags: ['AML', 'financial crime', 'fraud prevention', 'SM&CR', 'conduct risk'],
    suggested_next_step:
      'Board should review the Dear CEO letter immediately. Commission an independent assessment of your transaction monitoring calibration and SAR filing timelines against FCA benchmarks.',
    confidence_status: 'ai-generated',
    is_processed: true,
  },
]

async function seed() {
  console.log('\n🌱 BankScope Intelligence — Database Seeder')
  console.log('════════════════════════════════════════════')

  const db = createAdminClient()

  let inserted = 0
  let skipped = 0

  for (const item of SAMPLE_ITEMS) {
    const { data: existing } = await db
      .from('intelligence_items')
      .select('id')
      .eq('source_id', item.source_id)
      .single()

    if (existing) {
      console.log(`  ⏭  Skipped (exists): ${item.title.slice(0, 60)}…`)
      skipped++
      continue
    }

    const { error } = await db.from('intelligence_items').insert(item)
    if (error) {
      console.error(`  ❌ Failed: ${item.title.slice(0, 60)}: ${error.message}`)
    } else {
      console.log(`  ✅ Inserted: ${item.title.slice(0, 60)}…`)
      inserted++
    }
  }

  console.log(`\n✅ Seeding complete — ${inserted} inserted, ${skipped} skipped.\n`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
