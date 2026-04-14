// AI prompts for BankScope Intelligence summarisation pipeline

export const SYSTEM_PROMPT = `You are a specialist regulatory intelligence analyst for UK retail financial services.
Your role is to analyse regulatory publications, policy documents, enforcement actions, consultations, and market news,
then produce structured intelligence summaries for compliance, risk, and operations teams at banks, building societies,
savings providers, and specialist lenders.

You have deep expertise in:
- FCA conduct regulation and the Consumer Duty
- PRA prudential requirements (capital, liquidity, operational resilience)
- CASS (Client Asset Sourcebook) and safeguarding rules
- AML/financial crime obligations (MLRs, JMLSG guidance)
- UK GDPR and data protection obligations (ICO oversight)
- SM&CR (Senior Managers and Certification Regime)
- Mortgage regulation (MCOB, MCD)
- Consumer credit (CONC)
- Complaints handling (DISP)
- Payments regulation (PSD2/PSR, open banking)

You must always respond with valid JSON matching the exact schema provided.
Do not include any text outside the JSON object.
Be precise, factual, and avoid speculation.
Write summaries in plain English that a senior compliance officer can act on immediately.`

export interface SummarisePromptInput {
  title: string
  source_name: string
  content_type: string
  publish_date: string | null
  raw_excerpt: string | null
  source_url: string | null
}

export function buildSummarisePrompt(input: SummarisePromptInput): string {
  return `Analyse this UK regulatory or market intelligence item and return a JSON object with EXACTLY this structure:

{
  "summary": "string — 3-5 sentences in plain English. Must cover: (1) what this is, (2) the key change or finding, (3) why it matters for UK retail financial services firms",
  "affected_audience": ["array — select only from: banks, building societies, savings providers, current account providers, personal loan lenders, specialist lenders, credit unions, mortgage lenders, payment firms, all retail financial services firms"],
  "urgency": "one of: critical, high, medium, low",
  "action_required": "one of: yes, monitor, awareness",
  "regulatory_theme": "one of: conduct, prudential, consumer-duty, complaints, governance, operational-resilience, aml-fraud, data-privacy, market-competition, other",
  "suggested_next_step": "string — one specific, concrete action a compliance or risk team should take (e.g. 'Circulate the updated guidance to your mortgage operations team and schedule a gap analysis against your current MCOB arrangements by end of month'). Be specific, not generic.",
  "category_tags": ["array of 2-6 tags from this list: consumer duty, CASS, mortgage regulation, savings regulation, consumer credit, fraud prevention, operational resilience, data protection, AML, financial crime, stress testing, capital requirements, liquidity, conduct risk, vulnerable customers, complaints handling, access to cash, branch closures, open banking, BNPL, credit cards, overdrafts, unsecured lending, secured lending, crypto assets, ESG, climate risk, remuneration, SM&CR, authorisation, enforcement, reporting, FCA register, PSD2, payments, interest rates, inflation, cost of living, sanctions, MLRs, JMLSG, MCOB, CONC, DISP, SYSC, CREDS, BIPRU, CRR"],
  "priority_score": "integer 1-10 (10 = board-level immediate action, 1 = background reading only)",
  "priority_rationale": "string — 1-2 sentences explaining why this score was assigned (e.g. 'Scored 9 because this is an FCA enforcement action with immediate effect requiring firms to review their appointed representative oversight within 14 days.')",
  "deadline": "string in YYYY-MM-DD format if a specific regulatory deadline, consultation close date, or implementation date is mentioned — otherwise null"
}

Scoring guidance for priority_score:
- 9-10: Enforcement action, imminent rule change (under 2 weeks), or systemic market event
- 7-8: New rules entering force within 3 months, significant consultation with short response window, major supervisory letter
- 5-6: Consultation open with standard timeline, new guidance published, speech signalling future direction
- 3-4: Research paper, working paper, statistics release, longer-term policy signal
- 1-2: Background reading, minutes, routine data publication

Urgency guidance:
- critical: immediate action required (enforcement, systemic risk event, urgent deadline ≤2 weeks)
- high: action required within 1 month (new rules coming into force, supervisory expectations published)
- medium: monitor and plan (consultation open, new guidance, policy signal requiring review)
- low: awareness only (speech, research, background statistics, long-term signal)

Action classification:
- yes: firm must take specific action (rule change, enforcement risk, deadline to meet)
- monitor: track developments; may require future action
- awareness: informational only; no firm action needed now

Item to analyse:
Title: ${input.title}
Source: ${input.source_name}
Type: ${input.content_type}
Date: ${input.publish_date || 'Unknown'}
URL: ${input.source_url || 'Not available'}
Content excerpt: ${input.raw_excerpt || 'No excerpt available — base your analysis on the title and source only.'}

Respond with valid JSON only. Do not include markdown, code fences, or any text outside the JSON.`
}
