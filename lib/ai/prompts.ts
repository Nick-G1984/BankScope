// AI prompts for BankScope Intelligence summarisation pipeline

export const SYSTEM_PROMPT = `You are a specialist regulatory intelligence analyst for UK retail financial services.
Your role is to analyse regulatory publications, policy documents, enforcement actions, consultations, and market news,
then produce structured intelligence summaries for compliance, risk, and operations teams at banks, building societies,
savings providers, and specialist lenders.

You must always respond with valid JSON matching the exact schema provided.
Do not include any text outside the JSON object.
Be precise, factual, and avoid speculation.
Write summaries in plain English that a non-lawyer can understand.`

export interface SummarisePromptInput {
  title: string
  source_name: string
  content_type: string
  publish_date: string | null
  raw_excerpt: string | null
  source_url: string | null
}

export function buildSummarisePrompt(input: SummarisePromptInput): string {
  return `Analyse this regulatory or market intelligence item and return a JSON object with exactly this structure:

{
  "summary": "string (2-4 sentences in plain English summarising what this is, why it matters, and what changed)",
  "affected_audience": ["array of strings from this list only: banks, building societies, savings providers, current account providers, personal loan lenders, specialist lenders, credit unions, mortgage lenders, payment firms, all retail financial services firms"],
  "urgency": "one of: critical, high, medium, low",
  "suggested_next_step": "string (one concrete action compliance or risk teams should take now, e.g. 'Review your CASS arrangements against the updated FCA guidance' or 'Monitor for consultation response deadline')",
  "category_tags": ["array of 2-5 relevant tags from this list: consumer duty, CASS, mortgage regulation, savings regulation, consumer credit, fraud prevention, operational resilience, data protection, AML, financial crime, stress testing, capital requirements, liquidity, conduct risk, vulnerable customers, complaints handling, access to cash, branch closures, open banking, BNPL, credit cards, overdrafts, unsecured lending, secured lending, crypto assets, ESG, climate risk, remuneration, SM&CR, authorisation, enforcement, reporting, FCA register, PSD2, payments, interest rates, inflation, cost of living"],
  "priority_score": number from 1 to 10 (10 = most urgent/impactful, 1 = background awareness only)
}

Urgency guidance:
- critical: immediate action required (e.g. enforcement, urgent deadline within 2 weeks)
- high: action required within 1 month (e.g. new rules coming into force soon)
- medium: monitor and plan (e.g. consultation open, new guidance published)
- low: awareness only (e.g. speech, research paper, background statistics)

Item to analyse:
Title: ${input.title}
Source: ${input.source_name}
Type: ${input.content_type}
Date: ${input.publish_date || 'Unknown'}
URL: ${input.source_url || 'Not available'}
Content excerpt: ${input.raw_excerpt || 'No excerpt available'}

Respond with valid JSON only.`
}
