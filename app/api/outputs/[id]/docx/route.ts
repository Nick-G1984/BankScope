/**
 * GET /api/outputs/[id]/docx
 *
 * Generates and streams a .docx file for a saved premium output.
 * Requires Bearer auth — users can only download their own outputs.
 *
 * Response: application/vnd.openxmlformats-officedocument.wordprocessingml.document
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth/server'
import { getOutputById } from '@/lib/db/outputs'
import { generateDocx } from '@/lib/docx/generate-docx'
import { OUTPUT_TYPE_LABELS } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// DOCX generation can be compute-intensive for large outputs
export const maxDuration = 30

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth — user must own this output
    const { userId } = await requireAuth(request)

    // Fetch the saved output
    const output = await getOutputById(params.id, userId)
    if (!output) {
      return NextResponse.json({ error: 'Output not found' }, { status: 404 })
    }

    // Generate the DOCX buffer
    const buffer = await generateDocx(output)

    // Build a clean filename
    const typeSlug = OUTPUT_TYPE_LABELS[output.output_type]
      .toLowerCase()
      .replace(/\s+/g, '-')
    const dateStr = new Date(output.created_at)
      .toISOString()
      .slice(0, 10)                       // YYYY-MM-DD
    const filename = `bankscope-${typeSlug}-${dateStr}.docx`

    // Stream the buffer as an attachment
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
        // Prevent caching of sensitive outputs
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[api/outputs/docx] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
