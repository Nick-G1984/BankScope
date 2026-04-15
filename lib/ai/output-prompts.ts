/**
 * Prompt templates for the five premium output types.
 * Each returns a { system, user } pair ready for OpenAI chat completion.
 *
 * DO NOT mix with the summarisation prompts in prompts.ts.
 * These are for user-triggered deliverable generation only.
 */

import type { IntelligenceItem, OutputType } from '../types'

// ── Shared context builder ─────────────────────────────────────────────────

function buildItemContext(item: IntelligenceItem): string {
  const lines: string[] = [
    `Title: ${item.title}`,
    `Source: ${item.source_name}`,
    `Content type: ${item.content_type}`,
    `Published: ${item.publish_date ?? 'not stated'}`,
    `Urgency: ${item.urgency ?? 'not assessed'}`,
    `Priority score: ${item.priority_score ?? 'not scored'}/10`,
    `Regulatory theme: ${item.regulatory_theme ?? 'not categorised'}`,
    `Action required: ${item.action_required ?? 'not stated'}`,
    item.ai_summary ? `Summary: ${item.ai_summary}` : '',
    item.why_it_matters ? `Why it matters: ${item.why_it_matters}` : '',
    item.suggested_next_step ? `Suggested next step: ${item.suggested_next_step}` : '',
    item.affected_audience.length > 0 ? `Affected firm types: ${item.affected_audience.join(', ')}` : '',
    item.affected_functions.length > 0 ? `Affected internal functions: ${item.affected_functions.join(', ')}` : '',
    item.category_tags.length > 0 ? `Topic tags: ${item.category_tags.join(', ')}` : '',
    item.priority_rationale ? `Priority rationale: ${item.priority_rationale}` : '',
    item.source_url ? `Source URL: ${item.source_url}` : '',
  ]
  return lines.filter(Boolean).join('\n')
}

const SHARED_SYSTEM = `You are a specialist regulatory change analyst embedded within a UK financial services firm.
You write structured, professional internal deliverables for compliance, risk, PMO, and operational teams.
Your outputs are practical, not theoretical. Use UK English. Name specific teams, roles, and frameworks.
Be specific: cite the regulatory instrument or publication where possible. Avoid vague language.
Return only valid JSON matching the exact schema requested.`

// ── Delivery Brief ─────────────────────────────────────────────────────────

export function deliveryBriefPrompt(item: IntelligenceItem): { system: string; user: string } {
  return {
    system: SHARED_SYSTEM,
    user: `Generate a Delivery Brief for the following regulatory intelligence item.
This brief will be distributed to compliance, risk, and operations leads.

ITEM DETAILS:
${buildItemContext(item)}

Return a JSON object with EXACTLY this structure:
{
  "what_changed": "2–3 sentences: what the regulator has published or changed, naming the specific rule, guidance, or instrument",
  "why_it_matters": "2–3 sentences: the practical implication for the firm, naming the specific risk or exposure",
  "affected_areas": ["array of 3–6 specific business areas within the firm, e.g. Retail Banking, Mortgage Origination, Savings Operations"],
  "key_risks": ["3–5 specific risks if the firm does not respond, e.g. 'FCA Section 166 review risk if consumer duty gap analysis is not completed'"],
  "recommended_owners": [
    {"role": "specific role title within the firm", "responsibility": "what this person or team must do and by when"}
  ],
  "immediate_actions": ["3–5 concrete actions the firm must take in the next 30 days, with owner indicated"],
  "suggested_timeline": "e.g. '8 weeks from publication date' or 'by Q3 2026'",
  "confidence_note": "one sentence: what is drawn directly from the source vs what is inferred or recommended practice"
}`,
  }
}

// ── Compliance Action Pack ─────────────────────────────────────────────────

export function compliancePackPrompt(item: IntelligenceItem): { system: string; user: string } {
  return {
    system: SHARED_SYSTEM,
    user: `Generate a Compliance Action Pack for the following regulatory intelligence item.
This pack will be used by the compliance function to structure their response.

ITEM DETAILS:
${buildItemContext(item)}

Return a JSON object with EXACTLY this structure:
{
  "regulatory_obligations": ["4–6 specific obligations this item creates or reinforces, citing the regulation or rule number where possible"],
  "policies_impacted": ["3–5 internal policies or frameworks that likely need review or updating, e.g. 'Consumer Duty Customer Outcomes Policy', 'Complaints Handling Framework'"],
  "controls_to_review": ["4–6 specific controls that should be tested or assessed in response"],
  "evidence_required": ["4–6 types of evidence the firm should produce to demonstrate compliance, e.g. 'Board-approved gap analysis', 'Training completion records for frontline staff'"],
  "suggested_attestations": ["2–4 attestations or sign-offs that may be required, e.g. 'Compliance Director attestation of policy review completion'"],
  "monitoring_actions": ["3–5 ongoing monitoring steps to embed in BAU compliance monitoring"],
  "confidence_note": "one sentence on confidence level and what is inferred vs directly stated in the source"
}`,
  }
}

// ── Governance Brief ───────────────────────────────────────────────────────

export function governanceBriefPrompt(item: IntelligenceItem): { system: string; user: string } {
  return {
    system: SHARED_SYSTEM,
    user: `Generate a Governance Brief for the following regulatory intelligence item.
This brief will be used to ensure the appropriate governance bodies are informed and decisions are made.

ITEM DETAILS:
${buildItemContext(item)}

Return a JSON object with EXACTLY this structure:
{
  "decision_points": ["3–5 specific decisions the firm must make in response to this item, e.g. 'Decide whether to extend scope of Consumer Duty assessment to SME products'"],
  "risk_areas": ["3–5 governance risk areas this item exposes, e.g. 'Regulatory capital adequacy', 'Third party operational risk'"],
  "dependencies": ["3–4 internal dependencies that affect the firm's ability to respond, e.g. 'Completion of ongoing IT systems migration', 'Outsourced function contract renewal'"],
  "required_governance_forums": ["2–4 governance forums that should receive a paper or update, e.g. 'Regulatory Compliance Committee', 'Executive Risk Committee', 'Board Audit & Risk Committee'"],
  "escalation_considerations": ["2–3 conditions under which this item should escalate to a higher governance tier, e.g. 'If gap analysis identifies material non-compliance with new requirement'"],
  "confidence_note": "one sentence on what is drawn from the source vs governance best practice"
}`,
  }
}

// ── Board Summary ──────────────────────────────────────────────────────────

export function boardSummaryPrompt(item: IntelligenceItem): { system: string; user: string } {
  return {
    system: SHARED_SYSTEM,
    user: `Generate a Board Summary for the following regulatory intelligence item.
This summary will be presented to the Board of Directors or a Board-level committee.
Write in clear, concise language suitable for non-specialist directors.

ITEM DETAILS:
${buildItemContext(item)}

Return a JSON object with EXACTLY this structure:
{
  "executive_summary": "3–4 sentences: what has happened, why it matters to the firm, and what the firm's response will be. Non-technical language.",
  "strategic_relevance": "2–3 sentences: how this connects to the firm's strategic objectives, operating model, or risk appetite",
  "regulatory_exposure": "2–3 sentences: what the firm's current exposure is and what the consequence of non-compliance would be, including potential regulatory action",
  "key_decisions_required": ["2–3 specific decisions the Board must make or approve, e.g. 'Approve additional compliance resource allocation of £X for remediation programme'"],
  "board_questions": ["3–5 questions a Board member should ask management to satisfy themselves that the firm is responding adequately"],
  "confidence_note": "one sentence noting that this is an AI-assisted summary based on the cited source and should be reviewed by the compliance function before Board distribution"
}`,
  }
}

// ── Implementation Plan ────────────────────────────────────────────────────

export function implementationPlanPrompt(item: IntelligenceItem): { system: string; user: string } {
  return {
    system: SHARED_SYSTEM,
    user: `Generate an Implementation Plan for the following regulatory intelligence item.
This plan will be used by the PMO, change management, and programme delivery teams.

ITEM DETAILS:
${buildItemContext(item)}

Return a JSON object with EXACTLY this structure:
{
  "workstreams": [
    {
      "name": "workstream name, e.g. 'Policy & Governance'",
      "description": "what this workstream covers and must deliver",
      "owner_role": "typical role that would lead this workstream, e.g. 'Head of Compliance'"
    }
  ],
  "milestones": [
    {
      "milestone": "specific deliverable, e.g. 'Gap analysis completed and presented to ExCo'",
      "timeframe": "e.g. 'Week 3' or 'Day 15'",
      "phase": "e.g. 'Mobilisation' or 'Delivery' or 'Embedding'"
    }
  ],
  "raid": {
    "risks": ["3–4 delivery risks, e.g. 'Key compliance SME unavailable due to other regulatory deadlines'"],
    "assumptions": ["2–3 assumptions the plan is based on, e.g. 'Legal interpretation of new rule aligns with current compliance approach'"],
    "issues": ["1–2 known issues that need resolving before delivery can proceed, or 'None identified at this stage'"],
    "dependencies": ["2–3 dependencies on other teams, systems, or external parties"]
  },
  "delivery_phases": {
    "days_0_30": ["3–4 priority actions in the first month"],
    "days_31_60": ["3–4 actions in month two"],
    "days_61_90": ["3–4 actions in month three, including embedding and sign-off"]
  },
  "confidence_note": "one sentence: this plan is a starter framework based on the regulatory publication and should be refined with input from the delivery team and programme office"
}
Generate 3–5 workstreams and 5–8 milestones.`,
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
