import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { saveEmailSignup } from '@/lib/db/intelligence'

const EmailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = EmailSchema.parse(body)

    await saveEmailSignup(email)

    return NextResponse.json({ success: true, message: 'Thank you — we will be in touch.' })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? 'Invalid email' },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[api/email-signup] Error:', message)
    return NextResponse.json({ error: 'Failed to save email' }, { status: 500 })
  }
}
