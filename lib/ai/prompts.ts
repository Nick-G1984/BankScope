// AI prompts for BankScope Intelligence summarisation pipeline

export const SYSTEM_PROMPT = `You are a specialist regulatory intelligence analyst for UK retail financial services.
Your role is to analyse regulatory publications, policy documents, enforcement actions, consultations, and market news,
then produce structured intelligence summaries for compliance, risk, operations, change management, and PMO teams
at banks, building societies, savings providers, and specialist lenders.

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

You understand how regulatory change flows through a financial services firm:
- Compliance teams assess regulatory scope, update policies, and own gap analyses
- Risk teams update risk registers, scenario models, and controls frameworks
- Operations teams change processes, controls, and customer-facing procedures
- Change management / PMO teams scope and deliver the resulting programmes
- Legal teams review rules-based obligations and draft policy wording
- Technology teams implement system changes required by new rules
- Treasury teams respond to capital, liquidity, and prudential changes
- Board and ExCo need horizon-scanning and escalation-level items

You must always respond with valid JSON matching the exact schema provided.
Do not include any text outside the JSON object.
Be precise, factual, and avoid speculation.
Write in plain English that a busy compliance officer or programme manager can act on immediately.
Never use vague phrases like "firms should review their policies" — always name the specific rule, the specific team, and the specific action.`

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
  "summary": "string — 3-5 sentences following this exact structure: (1) What this item is and which regulator or authority published it. (2) What specifically has changed, been proposed, or decided — name the rule, product, or obligation affected. (3) Why this matters for UK retail financial services firms — name the specific compliance risk, operational obligation, or strategic implication. Do NOT use vague language like 'firms should be aware'. Be direct and specific. Maximum 120 words.",

  "why_it_matters": "string — 1-2 sentences only. State the single most important practical implication for a UK retail FS firm: what could go wrong if ignored, what competitive or regulatory risk exists, or what opportunity is presented. Start with the firm type most at risk. Example: 'Mortgage lenders face a December 2026 implementation deadline for revised affordability stress-testing rules; firms that have not updated their credit models by then risk FCA intervention.' Maximum 60 words.",

  "affected_firm_types": ["array — select only from: banks, building societies, savings providers, current account providers, personal loan lenders, specialist lenders, credit unions, mortgage lenders, payment firms, all retail financial services firms"],

  "affected_functions": ["array — select all internal teams that need to act or be briefed. Choose from: compliance, risk, legal, operations, technology, change-management, PMO, treasury, finance, HR, board"],

  "action_required": "one of: yes, monitor, awareness",

  "deadline": "string in YYYY-MM-DD format if a specific regulatory deadline, consultation close date, or implementation date is mentioned in the content — otherwise null. Extract exact dates when stated; do not infer or estimate.",

  "regulatory_theme": "one of: conduct, prudential, consumer-duty, complaints, governance, operational-resilience, aml-fraud, data-privacy, market-competition, other",

  "priority_score": "integer 1-10 (10 = board-level immediate action, 1 = background reading only)",

  "priority_rationale": "string — 2 sentences. Sentence 1: state the score and the primary reason (e.g. 'Scored 8 because this FCA supervisory statement sets new board-level expectations on operational resilience with a March 2026 implementation target.'). Sentence 2: name the firm type and function most affected (e.g. 'All deposit-takers must ensure their Operations and Technology teams have completed impact assessments before Q1 close.'). Maximum 60 words.",

  "urgency": "one of: critical, high, medium, low",

  "category_tags": ["array of 2-6 tags from this list: consumer duty, CASS, mortgage regulation, savings regulation, consumer credit, fraud prevention, operational resilience, data protection, AML, financial crime, stress testing, capital requirements, liquidity, conduct risk, vulnerable customers, complaints handling, access to cash, branch closures, open banking, BNPL, credit cards, overdrafts, unsecured lending, secured lending, crypto assets, ESG, climate risk, remuneration, SM&CR, authorisation, enforcement, reporting, FCA register, PSD2, payments, interest rates, inflation, cost of living, sanctions, MLRs, JMLSG, MCOB, CONC, DISP, SYSC, CREDS, BIPRU, CRR"],

  "suggested_next_step": "string — one specific, concrete action for the most affected compliance or risk team. Name the team, name the rulebook or document, and give a realistic timeframe. Bad example: 'Review internal policies.' Good example: 'Compliance team should circulate CP24/2 to mortgage operations and credit risk by end of this week, schedule a gap analysis against current MCOB affordability rules, and flag to the Change Board if a policy update programme is needed before the 30 June consultation close date.' Maximum 80 words."
}

Scoring guidance for priority_score:
- 9-10: Enforcement action, imminent rule change (under 2 weeks), or systemic market event requiring board escalation
- 7-8: New rules entering force within 3 months, significant consultation with short response window, major supervisory letter or Dear CEO letter
- 5-6: Consultation open with standard timeline, new guidance published, speech signalling future direction with identifiable implications
- 3-4: Research paper, working paper, statistics release, longer-term policy signal with no immediate obligation
- 1-2: Background reading, committee minutes, routine data publication, FCA register update

Urgency guidance:
- critical: immediate action required (enforcement, systemic risk event, urgent deadline ≤2 weeks)
- high: action required within 1 month (new rules coming into force, supervisory expectations published, Dear CEO letter)
- medium: monitor and plan (consultation open, new guidance, policy signal requiring gap analysis)
- low: awareness only (speech, research, background statistics, long-term signal with no near-term obligation)

Action classification:
- yes: firm must take specific action (rule change in force, enforcement risk, deadline to meet, mandatory notification)
- monitor: track developments; may require future action once finalised
- awareness: informational only; no firm action needed now

Item to analyse:
Title: ${input.title}
Source: ${input.source_name}
Type: ${input.content_type}
Date: ${input.publish_date || 'Unknown'}
URL: ${input.source_url || 'Not available'}
Content excerpt: ${input.raw_excerpt || 'No excerpt available — base your analysis on the title and source only. Be conservative on priority_score (cap at 6) when no excerpt is available.'}

Respond with valid JSON only. Do not include markdown, code fences, or any text outside the JSON.`
}
