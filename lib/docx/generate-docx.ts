/**
 * DOCX generation service for premium BankScope Intelligence deliverables.
 *
 * Library: docx v8 (https://docx.js.org/)
 * Why docx: TypeScript-first, zero-dependency DOCX generation, produces real
 * Word-compatible .docx files with full formatting support. Runs in Node.js
 * without headless browser or conversion tools.
 *
 * Entry point: generateDocx(output) → Promise<Buffer>
 * The buffer is streamed directly by /api/outputs/[id]/docx as an attachment.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  UnderlineType,
  TabStopType,
  TabStopPosition,
} from 'docx'
import type {
  GeneratedOutput,
  OutputType,
  DeliveryBriefContent,
  CompliancePackContent,
  GovernanceBriefContent,
  BoardSummaryContent,
  ImplementationPlanContent,
} from '../types'
import { OUTPUT_TYPE_LABELS } from '../types'

// ── Colour palette ──────────────────────────────────────────────────────────
// Mid-blue brand colour consistent with the BankScope UI
const BRAND_HEX = '1D4ED8'      // brand-700 equivalent
const LIGHT_BLUE = 'DBEAFE'     // blue-100
const AMBER_BG   = 'FEF3C7'     // amber-100
const RED_BG     = 'FEE2E2'     // red-100
const GREEN_BG   = 'D1FAE5'     // green-100
const GRAY_BG    = 'F3F4F6'     // gray-100
const DARK_GRAY  = '374151'     // gray-700
const MID_GRAY   = '6B7280'     // gray-500
const LIGHT_GRAY = 'E5E7EB'     // gray-200

// ── Font settings ──────────────────────────────────────────────────────────
const BODY_FONT  = 'Calibri'
const HEAD_FONT  = 'Calibri'
const MONO_FONT  = 'Courier New'

// ── Helper builders ────────────────────────────────────────────────────────

function spacer(lines = 1): Paragraph[] {
  return Array.from({ length: lines }, () => new Paragraph({ text: '' }))
}

function rule(): Paragraph {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LIGHT_GRAY } },
    spacing: { after: 120 },
  })
}

/** Main section heading (H1 equivalent) */
function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    run: {
      font: HEAD_FONT,
      size: 26,           // 13pt
      bold: true,
      color: BRAND_HEX,
    },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: LIGHT_BLUE },
    },
  })
}

/** Sub-section heading (H2 equivalent) */
function subHeading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    run: {
      font: HEAD_FONT,
      size: 22,           // 11pt
      bold: true,
      color: DARK_GRAY,
    },
  })
}

/** Standard body paragraph */
function body(text: string, opts: { bold?: boolean; italic?: boolean; colour?: string } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 276 },
    children: [
      new TextRun({
        text,
        font: BODY_FONT,
        size: 20,         // 10pt
        bold: opts.bold,
        italics: opts.italic,
        color: opts.colour ?? DARK_GRAY,
      }),
    ],
  })
}

/** Bulleted list item */
function bullet(text: string, colour = DARK_GRAY): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80, line: 276 },
    children: [
      new TextRun({
        text,
        font: BODY_FONT,
        size: 20,
        color: colour,
      }),
    ],
  })
}

/** Numbered list item */
function numbered(text: string, n: number): Paragraph {
  return new Paragraph({
    spacing: { after: 80, line: 276 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: `${n}.\t`, font: BODY_FONT, size: 20, bold: true, color: BRAND_HEX }),
      new TextRun({ text, font: BODY_FONT, size: 20, color: DARK_GRAY }),
    ],
  })
}

/** Shaded callout box — simulated with a single-row, single-column table */
function calloutBox(label: string, text: string, bgHex: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:    { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left:   { style: BorderStyle.NONE },
      right:  { style: BorderStyle.NONE },
      insideH:{ style: BorderStyle.NONE },
      insideV:{ style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: bgHex, type: ShadingType.CLEAR, color: 'auto' },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({ text: label, font: BODY_FONT, size: 18, bold: true, color: BRAND_HEX }),
                ],
              }),
              new Paragraph({
                spacing: { after: 0, line: 276 },
                children: [
                  new TextRun({ text, font: BODY_FONT, size: 20, color: DARK_GRAY }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

/** Two-column key-value table row */
function kvRow(key: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { fill: GRAY_BG, type: ShadingType.CLEAR, color: 'auto' },
        margins: { top: 60, bottom: 60, left: 120, right: 80 },
        children: [new Paragraph({
          children: [new TextRun({ text: key, font: BODY_FONT, size: 18, bold: true, color: DARK_GRAY })],
        })],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: value, font: BODY_FONT, size: 18, color: DARK_GRAY })],
        })],
      }),
    ],
  })
}

/** Generic two-column table */
function kvTable(rows: Array<[string, string]>): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([k, v]) => kvRow(k, v)),
  })
}

// ── Cover section ──────────────────────────────────────────────────────────

function buildCoverSection(output: GeneratedOutput): (Paragraph | Table)[] {
  const typeLabel = OUTPUT_TYPE_LABELS[output.output_type]
  const generatedAt = new Date(output.created_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return [
    // Firm identifier
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: 'BANKSCOPE INTELLIGENCE',
          font: HEAD_FONT, size: 18, bold: true,
          color: MID_GRAY, allCaps: true,
        }),
      ],
    }),
    // Document type
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: typeLabel.toUpperCase(),
          font: HEAD_FONT, size: 40, bold: true, color: BRAND_HEX, allCaps: true,
        }),
      ],
    }),
    // Item title
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: output.source_item_title ?? output.title,
          font: HEAD_FONT, size: 26, bold: false, color: DARK_GRAY,
        }),
      ],
    }),
    rule(),
    // Metadata table
    kvTable([
      ['Generated', generatedAt],
      ['Source organisation', output.source_name ?? 'Not specified'],
      ['Source publication', output.source_item_title ?? 'See below'],
      ['Source link', output.source_item_url ?? 'Not available'],
    ]),
    ...spacer(1),
    // Trust / disclaimer callout
    calloutBox(
      '⚠ AI-Assisted Document — Source Transparency Notice',
      `This document was generated by BankScope Intelligence AI from the source publication cited above. ` +
      `Factual statements are drawn from or directly implied by the source document. ` +
      `Recommended actions, suggested owners, timelines, and governance suggestions are AI-assisted and ` +
      `must be validated internally before use. This document does not constitute legal or regulatory advice.`,
      AMBER_BG
    ),
    ...spacer(1),
  ]
}

// ── Header / Footer ────────────────────────────────────────────────────────

function buildHeader(typeLabel: string): Header {
  return new Header({
    children: [
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LIGHT_GRAY } },
        spacing: { after: 120 },
        children: [
          new TextRun({ text: `BankScope Intelligence  |  ${typeLabel}`, font: BODY_FONT, size: 16, color: MID_GRAY }),
        ],
      }),
    ],
  })
}

function buildFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: LIGHT_GRAY } },
        spacing: { before: 120 },
        children: [
          new TextRun({ text: 'Confidential — AI-assisted. For internal use only. Not legal or regulatory advice.   Page ', font: BODY_FONT, size: 16, color: MID_GRAY }),
          new TextRun({ children: [new PageNumber()], font: BODY_FONT, size: 16, color: MID_GRAY }),
        ],
      }),
    ],
  })
}

// ── Content renderers by output type ──────────────────────────────────────

function renderDeliveryBrief(c: DeliveryBriefContent): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []

  if (c.document_purpose) {
    elements.push(calloutBox('Document purpose', c.document_purpose, LIGHT_BLUE), ...spacer(1))
  }

  if (c.executive_summary) {
    elements.push(sectionHeading('Executive Summary'))
    elements.push(body(c.executive_summary))
    elements.push(...spacer(1))
  }

  elements.push(sectionHeading('What Changed'))
  elements.push(body(c.what_changed))

  if (c.source_grounded_facts && c.source_grounded_facts.length > 0) {
    elements.push(subHeading('Key Facts from Source'))
    c.source_grounded_facts.forEach(f => elements.push(bullet(f, DARK_GRAY)))
  }

  elements.push(...spacer(1))
  elements.push(sectionHeading('Why It Matters'))
  elements.push(calloutBox('Practical implication', c.why_it_matters, AMBER_BG))

  elements.push(...spacer(1))
  elements.push(sectionHeading('Affected Business Areas'))
  c.affected_areas.forEach(a => elements.push(bullet(a)))

  elements.push(...spacer(1))
  elements.push(sectionHeading('Key Risks'))
  ;(c.key_risks as Array<string | { risk: string; likelihood?: string; impact?: string }>)
    .forEach((r, i) => {
      if (typeof r === 'string') {
        elements.push(bullet(r))
      } else {
        elements.push(bullet(`${r.risk}${r.likelihood ? `  [Likelihood: ${r.likelihood}` : ''}${r.impact ? ` | Impact: ${r.impact}]` : ''}`))
      }
    })

  elements.push(...spacer(1))
  elements.push(sectionHeading('Recommended Owners'))
  const ownerRows = (c.recommended_owners as Array<{ role: string; responsibility: string; timeframe?: string }>)
    .map(o => {
      const val = `${o.responsibility}${o.timeframe ? `\nBy: ${o.timeframe}` : ''}`
      return [o.role, val] as [string, string]
    })
  elements.push(kvTable(ownerRows))

  elements.push(...spacer(1))
  elements.push(sectionHeading('Immediate Actions (AI-Recommended)'))
  elements.push(body('The following actions are AI-suggested and should be validated with your compliance team before execution.', { italic: true, colour: MID_GRAY }))
  c.immediate_actions.forEach((a, i) => elements.push(numbered(a, i + 1)))

  elements.push(...spacer(1))
  elements.push(sectionHeading('Suggested Timeline'))
  elements.push(calloutBox('Implementation window', c.suggested_timeline, GREEN_BG))

  return elements
}

function renderCompliancePack(c: CompliancePackContent): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []

  if (c.document_purpose) {
    elements.push(calloutBox('Document purpose', c.document_purpose, LIGHT_BLUE), ...spacer(1))
  }

  if (c.compliance_deadline) {
    elements.push(calloutBox('Compliance Deadline', c.compliance_deadline, AMBER_BG), ...spacer(1))
  }

  elements.push(sectionHeading('Regulatory Obligations'))
  c.regulatory_obligations.forEach(o => elements.push(bullet(o)))

  elements.push(...spacer(1))
  elements.push(sectionHeading('Policies Requiring Review'))
  c.policies_impacted.forEach(p => elements.push(bullet(p)))

  elements.push(...spacer(1))
  elements.push(sectionHeading('Controls to Review'))
  c.controls_to_review.forEach(ctrl => elements.push(bullet(ctrl)))

  elements.push(...spacer(1))
  elements.push(sectionHeading('Evidence Required'))
  elements.push(body('The firm should produce the following evidence to demonstrate compliance:', { italic: true, colour: MID_GRAY }))
  c.evidence_required.forEach((e, i) => elements.push(numbered(e, i + 1)))

  elements.push(...spacer(1))
  elements.push(sectionHeading('Suggested Attestations'))
  c.suggested_attestations.forEach(a => elements.push(bullet(a)))

  elements.push(...spacer(1))
  elements.push(sectionHeading('Ongoing Monitoring Actions'))
  c.monitoring_actions.forEach(m => elements.push(bullet(m)))

  return elements
}

function renderGovernanceBrief(c: GovernanceBriefContent): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []

  if (c.document_purpose) {
    elements.push(calloutBox('Document purpose', c.document_purpose, LIGHT_BLUE), ...spacer(1))
  }

  if (c.executive_summary) {
    elements.push(sectionHeading('Executive Summary'))
    elements.push(body(c.executive_summary))
    elements.push(...spacer(1))
  }

  elements.push(sectionHeading('Decision Points'))
  ;(c.decision_points as Array<string | { decision: string; forum?: string; urgency?: string }>)
    .forEach((dp, i) => {
      if (typeof dp === 'string') {
        elements.push(numbered(dp, i + 1))
      } else {
        const detail = `${dp.decision}${dp.forum ? `\nForum: ${dp.forum}` : ''}${dp.urgency ? ` | Urgency: ${dp.urgency}` : ''}`
        elements.push(numbered(detail, i + 1))
      }
    })

  elements.push(...spacer(1))
  elements.push(sectionHeading('Governance Risk Areas'))
  c.risk_areas.forEach(r => elements.push(bullet(r)))

  elements.push(...spacer(1))
  elements.push(sectionHeading('Required Governance Forums'))
  c.required_governance_forums.forEach(f => elements.push(bullet(f)))

  elements.push(...spacer(1))
  elements.push(sectionHeading('Dependencies'))
  c.dependencies.forEach(d => elements.push(bullet(d)))

  elements.push(...spacer(1))
  elements.push(sectionHeading('Escalation Considerations'))
  c.escalation_considerations.forEach(e => elements.push(bullet(e)))

  if (c.reporting_cadence) {
    elements.push(...spacer(1))
    elements.push(sectionHeading('Reporting Cadence'))
    elements.push(calloutBox('Suggested reporting', c.reporting_cadence, LIGHT_BLUE))
  }

  return elements
}

function renderBoardSummary(c: BoardSummaryContent): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []

  if (c.document_purpose) {
    elements.push(calloutBox('Document purpose', c.document_purpose, LIGHT_BLUE), ...spacer(1))
  }

  elements.push(sectionHeading('Executive Summary'))
  elements.push(calloutBox('For the Board', c.executive_summary, GRAY_BG))

  elements.push(...spacer(1))
  elements.push(sectionHeading('Strategic Relevance'))
  elements.push(body(c.strategic_relevance))

  elements.push(...spacer(1))
  elements.push(sectionHeading('Regulatory Exposure'))
  elements.push(calloutBox('Risk to the firm', c.regulatory_exposure, RED_BG))

  if (c.management_response) {
    elements.push(...spacer(1))
    elements.push(sectionHeading('Management Response'))
    elements.push(calloutBox('What management is doing', c.management_response, GREEN_BG))
  }

  elements.push(...spacer(1))
  elements.push(sectionHeading('Key Decisions Required'))
  elements.push(body('The Board is asked to consider the following:', { italic: true, colour: MID_GRAY }))
  c.key_decisions_required.forEach((d, i) => elements.push(numbered(d, i + 1)))

  elements.push(...spacer(1))
  elements.push(sectionHeading('Suggested Board Questions'))
  elements.push(body('Questions a diligent director should ask of management:', { italic: true, colour: MID_GRAY }))
  c.board_questions.forEach((q, i) => elements.push(numbered(q, i + 1)))

  return elements
}

function renderImplementationPlan(c: ImplementationPlanContent): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []

  if (c.document_purpose) {
    elements.push(calloutBox('Document purpose', c.document_purpose, LIGHT_BLUE), ...spacer(1))
  }

  if (c.programme_overview) {
    elements.push(sectionHeading('Programme Overview'))
    elements.push(body(c.programme_overview))
    elements.push(...spacer(1))
  }

  // Workstreams
  elements.push(sectionHeading('Workstreams'))
  c.workstreams.forEach((w, i) => {
    elements.push(subHeading(`${i + 1}. ${w.name}`))
    elements.push(kvTable([
      ['Owner role', w.owner_role],
      ['Description', w.description],
    ]))
    if (w.key_deliverables && w.key_deliverables.length > 0) {
      elements.push(new Paragraph({ text: '' }))
      elements.push(body('Key deliverables:', { bold: true }))
      w.key_deliverables.forEach(d => elements.push(bullet(d)))
    }
    elements.push(...spacer(1))
  })

  // Milestones table
  elements.push(sectionHeading('Milestones'))
  const milestoneTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // Header row
      new TableRow({
        tableHeader: true,
        children: ['Milestone', 'Timeframe', 'Phase', 'Owner'].map(h =>
          new TableCell({
            shading: { fill: BRAND_HEX, type: ShadingType.CLEAR, color: 'auto' },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({
              children: [new TextRun({ text: h, font: BODY_FONT, size: 18, bold: true, color: 'FFFFFF' })],
            })],
          })
        ),
      }),
      ...c.milestones.map((m, idx) =>
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: idx % 2 === 0 ? 'FFFFFF' : GRAY_BG, type: ShadingType.CLEAR, color: 'auto' },
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              children: [new Paragraph({ children: [new TextRun({ text: m.milestone, font: BODY_FONT, size: 18, color: DARK_GRAY })] })],
            }),
            new TableCell({
              shading: { fill: idx % 2 === 0 ? 'FFFFFF' : GRAY_BG, type: ShadingType.CLEAR, color: 'auto' },
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              children: [new Paragraph({ children: [new TextRun({ text: m.timeframe, font: BODY_FONT, size: 18, bold: true, color: BRAND_HEX })] })],
            }),
            new TableCell({
              shading: { fill: idx % 2 === 0 ? 'FFFFFF' : GRAY_BG, type: ShadingType.CLEAR, color: 'auto' },
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              children: [new Paragraph({ children: [new TextRun({ text: m.phase, font: BODY_FONT, size: 18, color: DARK_GRAY })] })],
            }),
            new TableCell({
              shading: { fill: idx % 2 === 0 ? 'FFFFFF' : GRAY_BG, type: ShadingType.CLEAR, color: 'auto' },
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              children: [new Paragraph({ children: [new TextRun({ text: m.owner ?? '—', font: BODY_FONT, size: 18, color: DARK_GRAY })] })],
            }),
          ],
        })
      ),
    ],
  })
  elements.push(milestoneTable)

  // 30/60/90 day plan
  elements.push(...spacer(1))
  elements.push(sectionHeading('30 / 60 / 90 Day Plan'))
  const phases = [
    { label: 'Days 0–30 (Mobilisation)', items: c.delivery_phases.days_0_30 },
    { label: 'Days 31–60 (Assessment & Delivery)', items: c.delivery_phases.days_31_60 },
    { label: 'Days 61–90 (Embedding & Closure)', items: c.delivery_phases.days_61_90 },
  ]
  phases.forEach(p => {
    elements.push(subHeading(p.label))
    p.items.forEach(item => elements.push(bullet(item)))
    elements.push(new Paragraph({ text: '' }))
  })

  // RAID
  elements.push(sectionHeading('RAID Log (Starter)'))
  const raid = c.raid
  elements.push(subHeading('Risks'))
  ;(raid.risks as Array<string | { description: string; mitigation?: string }>).forEach(r => {
    if (typeof r === 'string') {
      elements.push(bullet(r))
    } else {
      elements.push(bullet(`${r.description}${r.mitigation ? `\n  → Mitigation: ${r.mitigation}` : ''}`))
    }
  })
  elements.push(subHeading('Assumptions'))
  raid.assumptions.forEach(a => elements.push(bullet(a)))
  elements.push(subHeading('Issues'))
  raid.issues.forEach(i => elements.push(bullet(i)))
  elements.push(subHeading('Dependencies'))
  raid.dependencies.forEach(d => elements.push(bullet(d)))

  if (c.governance_and_reporting) {
    elements.push(...spacer(1))
    elements.push(sectionHeading('Governance & Reporting'))
    elements.push(body(c.governance_and_reporting))
  }

  if (c.success_criteria && c.success_criteria.length > 0) {
    elements.push(...spacer(1))
    elements.push(sectionHeading('Success Criteria'))
    c.success_criteria.forEach((s, i) => elements.push(numbered(s, i + 1)))
  }

  return elements
}

// ── Content dispatch ───────────────────────────────────────────────────────

function renderContent(output: GeneratedOutput): (Paragraph | Table)[] {
  const c = output.content
  switch (output.output_type) {
    case 'delivery_brief':
      return renderDeliveryBrief(c as DeliveryBriefContent)
    case 'compliance_pack':
      return renderCompliancePack(c as CompliancePackContent)
    case 'governance_brief':
      return renderGovernanceBrief(c as GovernanceBriefContent)
    case 'board_summary':
      return renderBoardSummary(c as BoardSummaryContent)
    case 'implementation_plan':
      return renderImplementationPlan(c as ImplementationPlanContent)
  }
}

// ── Confidence footer ──────────────────────────────────────────────────────

function buildConfidenceSection(output: GeneratedOutput): (Paragraph | Table)[] {
  const content = output.content as Record<string, unknown>
  const note = typeof content.confidence_note === 'string'
    ? content.confidence_note
    : 'This document was generated by AI from the source publication cited and should be reviewed by your compliance team before use.'

  return [
    ...spacer(1),
    rule(),
    sectionHeading('Confidence & Source Note'),
    calloutBox('AI Transparency', note, AMBER_BG),
    ...spacer(1),
    body(
      `Source: ${output.source_item_title ?? 'See header'}` +
      (output.source_item_url ? `\n${output.source_item_url}` : ''),
      { italic: true, colour: MID_GRAY }
    ),
    body(
      `Document generated: ${new Date(output.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} by BankScope Intelligence`,
      { italic: true, colour: MID_GRAY }
    ),
  ]
}

// ── Main export ────────────────────────────────────────────────────────────

export async function generateDocx(output: GeneratedOutput): Promise<Buffer> {
  const typeLabel = OUTPUT_TYPE_LABELS[output.output_type]

  const doc = new Document({
    creator: 'BankScope Intelligence',
    title: output.title,
    description: `${typeLabel} generated by BankScope Intelligence`,
    styles: {
      default: {
        document: {
          run: { font: BODY_FONT, size: 20, color: DARK_GRAY },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 }, // ~1.9cm margins
          },
        },
        headers: { default: buildHeader(typeLabel) },
        footers: { default: buildFooter() },
        children: [
          // Cover section
          ...buildCoverSection(output),
          // Type-specific content
          ...renderContent(output),
          // Confidence / source footer
          ...buildConfidenceSection(output),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}
