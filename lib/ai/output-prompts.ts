/**
 * Prompt templates for the five premium output types.
 * Each returns a { system, user } pair ready for OpenAI chat completion.
 *
 * v2 — Schema-first prompts that explicitly elicit:
 *   (a) source-grounded facts  — drawn directly from the publication
 *   (b) AI-assisted inferences — logical implications from the source
 *   (c) AI recommendations     — suggested actions / owners / timelines
 *
 * DO NOT mix with the summarisation prompts in prompts.ts.
 * These are for user-triggered premium deliverable generation only.
 */

import type { IntelligenceItem, OutputType } from '../types'

// ── Shared context builder ─────────────────────────────────────────────────

function buildItemContext(item: IntelligenceItem): string {
  const lines: string[] = [
    `Title: ${item.title}`,
    `Source organisation: ${item.source_name}`,
    `Content type: ${item.content_type}`,
    `Published: ${item.publish_date ?? 'not stated'}`,
    `Urgency assessed: ${item.urgency ?? 'not assessed'}`,
    `Priority score: ${item.priority_score ?? 'not scored'}/10`,
    `Regulatory theme: ${item.regulatory_theme ?? 'not categorised'}`,
    `Action required: ${item.action_required ?? 'not stated'}`,
    item.deadline ? `Stated compliance deadline: ${item.deadline}` : '',
    item.ai_summary ? `AI summary of source: ${item.ai_summary}` : '',
    item.why_it_matters ? `Why it matters: ${item.why_it_matters}` : '',
    item.suggested_next_step ? `Suggested next step: ${item.suggested_next_step}` : '',
    item.priority_rationale ? `Priority rationale: ${item.priority_rationale}` : '',
    item.affected_audience.length > 0 ? `Affected firm types: ${item.affected_audience.join(', ')}` : '',
    item.affected_functions.length > 0 ? `Affected internal functions: ${item.affected_functions.join(', ')}` : '',
    item.category_tags.length > 0 ? `Topic tags: ${item.category_tags.join(', ')}` : '',
    item.source_url ? `Source URL: ${item.source_url}` : '',
  ]
  return lines.filter(Boolean).join('\n')
}

const SHARED_SYSTEM = `You are a specialist regulatory change analyst embedded within a UK retail financial services firm.
You write structured, professional internal deliverables for compliance, risk, PMO, governance, and operational teams.

CRITICAL RULES:
1. Be specific. Name the regulatory instrument, rule number, or guidance title where known.
2. Distinguish clearly between:
   - FACTS: things explicitly stated or published in the source document
   - INFERENCES: logical implications that follow from the source
   - RECOMMENDATIONS: AI-suggested actions / owners / timelines (not from the source)
3. Never use management filler. Every sentence must carry specific operational content.
4. Use UK English. Reference UK regulatory bodies, frameworks, and typical UK FS firm structures.
5. Return ONLY valid JSON matching the schema exactly. No markdown, no explanation outside the JSON.
6. If information is not available from the source, say so explicitly rather than inventing specifics.`

// ── Delivery Brief ─────────────────────────────────────────────────────────

export function deliveryBriefPrompt(item: IntelligenceItem): { system: string; user: string } {
  return {
    system: SHARED_SYSTEM,
    user: `Generate a Delivery Brief for the following regulatory intelligence item.
Audience: Compliance director, Chief Risk Officer, and business area leads.
Purpose: Rapidly inform senior stakeholders of a regulatory change and the firm's required response.

INTELLIGENCE ITEM:
${buildItemContext(item)}

Return a JSON object with EXACTLY this schema:
{
  "document_purpose": "One sentence: what this Delivery Brief is for and who should receive it.",

  "executive_summary": "2–3 sentences covering: what the regulator has published, the key implication for the firm, and the most urgent action required. Non-technical but precise.",

  "source_grounded_facts": [
    "Fact 1: state something that is explicitly in or directly derivable from the source publication — e.g. the rule number, the deadline stated, the scope of firms covered",
    "Fact 2: ...",
    "Fact 3–5: continue for all material facts from the source"
  ],

  "what_changed": "2–3 sentences: what the regulator has published or changed. Name the specific rule, guidance number, or instrument. Distinguish new rule from amended guidance from consultation.",

  "why_it_matters": "2–3 sentences: practical implication for the firm. Name the specific risk or operational exposure if the firm does not respond.",

  "affected_areas": ["3–6 specific business areas within the firm — e.g. 'Mortgage Origination', 'Retail Savings Operations', 'Consumer Lending', 'Complaints Handling'"],

  "key_risks": [
    {
      "risk": "Specific risk statement — e.g. 'Failure to complete a Consumer Duty gap analysis by [deadline] creates risk of FCA supervisory review under the Consumer Duty rules (PRIN 2A)'",
      "likelihood": "High / Medium / Low",
      "impact": "High / Medium / Low"
    }
  ],

  "recommended_owners": [
    {
      "role": "Specific role title within the firm — e.g. 'Head of Compliance Monitoring', 'Retail Banking MD'",
      "responsibility": "What this person or team must own and deliver",
      "timeframe": "e.g. 'Within 2 weeks of publication' or 'By [deadline]'"
    }
  ],

  "immediate_actions": [
    "AI-RECOMMENDED ACTION: [concrete action] — owner: [role] — by: [timeframe]",
    "Continue for 4–6 specific, prioritised actions"
  ],

  "suggested_timeline": "e.g. '10 weeks from publication' — explain the basis for this estimate",

  "confidence_note": "One sentence stating: which elements come directly from the source publication, and which are AI-suggested based on regulatory best practice. Flag any areas of uncertainty."
}

Generate 3–5 source facts, 3–5 key risks, 3–5 recommended owners, and 4–6 immediate actions.`,
  }
}

// ── Compliance Action Pack ─────────────────────────────────────────────────

export function compliancePackPrompt(item: IntelligenceItem): { system: string; user: string } {
  return {
    system: SHARED_SYSTEM,
    user: `Generate a Compliance Action Pack for the following regulatory intelligence item.
Audience: Compliance function, compliance monitoring, and first line risk teams.
Purpose: Provide a structured compliance response framework the team can begin executing immediately.

INTELLIGENCE ITEM:
${buildItemContext(item)}

Return a JSON object with EXACTLY this schema:
{
  "document_purpose": "One sentence: what this Compliance Action Pack is for and how it should be used.",

  "regulatory_obligations": [
    "Obligation 1: specific obligation this item creates or reinforces. Cite the rule reference where possible — e.g. 'FCA PRIN 2A.3.1 requires firms to demonstrate good outcomes for retail customers; this publication sets out the FCA's expectations for [topic]'",
    "Continue for 4–6 specific obligations"
  ],

  "policies_impacted": [
    "Policy 1: internal policy or framework that likely requires review — e.g. 'Consumer Duty Customer Outcomes Policy', 'Fair Treatment of Customers Framework', 'Mortgage Advice Suitability Standard'",
    "Continue for 3–5 specific policies"
  ],

  "controls_to_review": [
    "Control 1: specific control that should be assessed or tested — e.g. 'MI reporting on product value assessments', 'Complaint root cause analysis process', 'Third-party due diligence checklist for outsourced servicing'",
    "Continue for 4–6 controls"
  ],

  "evidence_required": [
    "Evidence type 1: what the firm should produce to demonstrate compliance — e.g. 'Board-approved gap analysis against new requirements', 'Training completion records for all frontline staff', 'Documented product value assessment refresh'",
    "Continue for 4–6 evidence types"
  ],

  "suggested_attestations": [
    "Attestation 1: sign-off or attestation that may be required — e.g. 'Compliance Director attestation that policy review is complete and updated policies are approved', 'Senior Manager (SMF16) sign-off on gap analysis'",
    "Continue for 2–4 attestations"
  ],

  "monitoring_actions": [
    "Monitoring action 1: ongoing BAU monitoring step — e.g. 'Include [topic] in quarterly compliance monitoring plan from [date]', 'Add indicator to monthly MI dashboard'",
    "Continue for 3–5 monitoring actions"
  ],

  "compliance_deadline": "State the compliance deadline if explicitly mentioned in the source, or null if not stated",

  "confidence_note": "One sentence: distinguish what is drawn from the regulatory source versus what is compliance best practice suggested by AI. Note any areas where the firm should seek legal or regulatory advice."
}`,
  }
}

// ── Governance Brief ───────────────────────────────────────────────────────

export function governanceBriefPrompt(item: IntelligenceItem): { system: string; user: string } {
  return {
    system: SHARED_SYSTEM,
    user: `Generate a Governance Brief for the following regulatory intelligence item.
Audience: Chief Risk Officer, Company Secretary, members of the Risk Committee and Board Audit & Risk Committee.
Purpose: Ensure appropriate governance bodies are informed, that decisions are escalated, and that oversight is in place.

INTELLIGENCE ITEM:
${buildItemContext(item)}

Return a JSON object with EXACTLY this schema:
{
  "document_purpose": "One sentence: what this Governance Brief is for and which governance forums should receive it.",

  "executive_summary": "2–3 sentences: concise summary of the regulatory development and why it requires governance attention. State the nature and timeline of any decision required.",

  "decision_points": [
    {
      "decision": "Specific decision the firm must make — e.g. 'Approve scope of Consumer Duty gap analysis programme and resource allocation'",
      "forum": "Which forum should make this decision — e.g. 'Executive Risk Committee'",
      "urgency": "Immediate / Within 30 days / Within 60 days"
    }
  ],

  "risk_areas": [
    "Risk area 1: governance risk this item exposes — e.g. 'Regulatory capital adequacy risk if new prudential requirements are not factored into ICAAP'",
    "Continue for 3–5 governance risk areas"
  ],

  "dependencies": [
    "Dependency 1: internal or external factor that affects the firm's ability to respond — e.g. 'Completion of ongoing core banking system migration limits ability to implement data reporting changes before Q3'",
    "Continue for 2–4 dependencies"
  ],

  "required_governance_forums": [
    "Forum 1: governance body that should receive a paper or update — e.g. 'Regulatory Compliance Committee — for initial triage and workstream mobilisation'",
    "Continue for 2–4 forums with brief description of what each should receive"
  ],

  "escalation_considerations": [
    "Condition under which this item should escalate to a higher governance tier — e.g. 'If gap analysis identifies material non-compliance with new rule, escalate to Board Audit & Risk Committee within 5 working days'",
    "Continue for 2–3 escalation conditions"
  ],

  "reporting_cadence": "Suggested frequency and forum for ongoing updates — e.g. 'Monthly update to Regulatory Compliance Committee until programme closure; quarterly to Board Audit & Risk Committee'",

  "confidence_note": "One sentence distinguishing source-derived governance requirements from governance best-practice recommendations suggested by AI."
}

Generate 3–4 decision points and 2–4 governance forums.`,
  }
}

// ── Board Summary ──────────────────────────────────────────────────────────

export function boardSummaryPrompt(item: IntelligenceItem): { system: string; user: string } {
  return {
    system: SHARED_SYSTEM,
    user: `Generate a Board Summary for the following regulatory intelligence item.
Audience: Non-executive directors and independent Board members. Assume no specialist regulatory knowledge.
Purpose: Enable the Board to understand the issue, satisfy themselves that management is responding adequately, and make any required decisions.

INTELLIGENCE ITEM:
${buildItemContext(item)}

Return a JSON object with EXACTLY this schema:
{
  "document_purpose": "One sentence: what this paper is for and how the Board should use it.",

  "executive_summary": "3–4 sentences in plain English: what has happened (what the regulator has published), why it matters to the firm (the specific risk or strategic implication), and what management is doing about it. Avoid jargon. This is the most important section.",

  "strategic_relevance": "2–3 sentences: how this connects to the firm's strategic objectives, customer proposition, operating model, or risk appetite. Be specific about the strategic connection.",

  "regulatory_exposure": "2–3 sentences: what the firm's current exposure is, and what the consequence of non-compliance would be — including the specific regulatory body, likely supervisory action (e.g. Section 166, enforcement, public censure), and potential financial or reputational impact.",

  "management_response": "2–3 sentences: what management is doing or plans to do, including timelines. This gives the Board confidence that the matter is being managed.",

  "key_decisions_required": [
    "Specific decision the Board must make or approve — e.g. 'Approve additional compliance resource allocation of up to £[X] for the remediation programme, pending gap analysis completion'",
    "Continue for 2–3 Board-level decisions"
  ],

  "board_questions": [
    "Question 1 the Board should ask management to satisfy themselves the firm is responding adequately — e.g. 'What is the current gap between our existing practices and the new requirements, and when will the gap analysis be completed?'",
    "Continue for 4–6 probing questions a diligent NED would ask"
  ],

  "confidence_note": "One sentence: state this is an AI-assisted summary based on the cited source and should be reviewed by the compliance function and Company Secretary before Board distribution. Note that management response content is AI-suggested and should be updated to reflect actual management plans."
}`,
  }
}

// ── Implementation Plan ────────────────────────────────────────────────────

export function implementationPlanPrompt(item: IntelligenceItem): { system: string; user: string } {
  return {
    system: SHARED_SYSTEM,
    user: `Generate an Implementation Plan for the following regulatory intelligence item.
Audience: PMO, programme delivery leads, change management, and workstream owners.
Purpose: Provide a starter implementation framework that a delivery team can refine and begin executing immediately.

INTELLIGENCE ITEM:
${buildItemContext(item)}

Return a JSON object with EXACTLY this schema:
{
  "document_purpose": "One sentence: what this implementation plan is for and how a delivery team should use it.",

  "programme_overview": "2–3 sentences: what the programme must achieve, which regulatory requirement it responds to, and the overall timeline. Include the compliance deadline if stated.",

  "workstreams": [
    {
      "name": "Workstream name — e.g. 'Policy & Governance', 'Technology & Data', 'Training & Competency'",
      "description": "What this workstream covers and must deliver — 1–2 sentences",
      "owner_role": "Typical role that would lead this workstream — e.g. 'Head of Compliance Policy', 'Chief Data Officer'",
      "key_deliverables": [
        "Specific deliverable 1 — e.g. 'Updated Consumer Duty policy approved by ExCo'",
        "Specific deliverable 2"
      ]
    }
  ],

  "milestones": [
    {
      "milestone": "Specific, testable deliverable — e.g. 'Gap analysis completed and findings presented to ExCo'",
      "timeframe": "e.g. 'Week 3', 'Day 15', 'Month 2'",
      "phase": "e.g. 'Mobilisation', 'Assessment', 'Delivery', 'Embedding', 'Closure'",
      "owner": "Role responsible — e.g. 'Head of Compliance'"
    }
  ],

  "raid": {
    "risks": [
      {
        "description": "Delivery risk — e.g. 'Key compliance SME unavailable due to concurrent FCA Consumer Duty embedding work'",
        "mitigation": "How to mitigate — e.g. 'Identify and brief a deputy SME in week 1; assess workload with CPO'"
      }
    ],
    "assumptions": [
      "Assumption the plan is built on — e.g. 'Legal interpretation of the new rule is consistent with current compliance approach; to be validated by external counsel in week 1'"
    ],
    "issues": [
      "Known issue that needs resolving before delivery can proceed — or 'None identified at this stage'"
    ],
    "dependencies": [
      "Dependency on another team, system, or external party — e.g. 'IT must complete data migration to new CRM before new reporting requirements can be implemented'"
    ]
  },

  "delivery_phases": {
    "days_0_30": [
      "Priority action in first month — e.g. 'Mobilise programme governance: appoint workstream leads and hold kick-off'",
      "Continue for 3–4 month-one actions"
    ],
    "days_31_60": [
      "Month two action — e.g. 'Complete gap analysis and present findings to ExCo'",
      "Continue for 3–4 month-two actions"
    ],
    "days_61_90": [
      "Month three action including embedding and sign-off — e.g. 'Complete updated policy approvals and begin staff training roll-out'",
      "Continue for 3–4 month-three actions"
    ]
  },

  "governance_and_reporting": "1–2 sentences: suggested governance structure for the programme — who chairs, which forum receives updates, and how frequently.",

  "success_criteria": [
    "Criterion 1: measurable outcome that indicates programme success — e.g. 'All affected policies reviewed and approved by the Board by [date]'",
    "Continue for 3–5 success criteria"
  ],

  "confidence_note": "One sentence: this plan is a starter framework based on the regulatory publication and should be refined by the delivery team, programme office, and legal/compliance advisers before execution. Milestones and timelines are AI-suggested estimates only."
}

Generate 3–5 workstreams, 6–9 milestones, 3–4 risks with mitigations, and 3–4 success criteria.`,
  }
}

// ── Router ─────────────────────────────────────────────────────────────────

export function getOutputPrompt(
  type: OutputType,
  item: IntelligenceItem
): { system: string; user: string } {
  switch (type) {
    case 'delivery_brief':       return deliveryBriefPrompt(item)
    case 'compliance_pack':      return compliancePackPrompt(item)
    case 'governance_brief':     return governanceBriefPrompt(item)
    case 'board_summary':        return boardSummaryPrompt(item)
    case 'implementation_plan':  return implementationPlanPrompt(item)
  }
}
