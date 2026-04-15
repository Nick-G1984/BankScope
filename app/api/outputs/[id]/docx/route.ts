import { NextRequest, NextResponse } from 'next/server'
import { getOutputById } from '@/lib/db/outputs'
import { requireAuth } from '@/lib/auth/server'
import { generateDocx } from '@/lib/docx/generate-docx'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request)
    const user = auth.user

    const output = await getOutputById(params.id, user.id)

    if (!output) {
      return NextResponse.json({ error: 'Output not found' }, { status: 404 })
    }

    const buffer = await generateDocx(output)

    const contentType =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    const safeType = slugify(output.output_type || 'document')
    const safeDate = new Date().toISOString().slice(0, 10)
    const filename = `bankscope-${safeType}-${safeDate}.docx`

    const arrayBuffer = Uint8Array.from(buffer).buffer

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[docx-download] Failed to generate DOCX:', error)

    return NextResponse.json(
      { error: 'Failed to generate DOCX' },
      { status: 500 }
    )
  }
}