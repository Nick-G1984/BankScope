import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth/server'
import {
  getUserComplianceTasks,
  createComplianceTask,
  updateComplianceTask,
  deleteComplianceTask,
} from '@/lib/db/compliance-tasks'
import type { ComplianceTaskStatus } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── GET /api/compliance-tasks?classification_id=<uuid> ─────────────────────
// Returns the authenticated user's compliance tasks, optionally filtered by
// classification_id.

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)
    const { searchParams } = request.nextUrl
    const classificationId = searchParams.get('classification_id') || undefined

    const tasks = await getUserComplianceTasks(userId, classificationId)
    return NextResponse.json({ data: tasks, total: tasks.length })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[api/compliance-tasks] GET error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── POST /api/compliance-tasks ──────────────────────────────────────────────
// Create a new compliance task.
// Body: { classification_id: string, task: string, status?: string, due_date?: string }

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { classification_id, task, status = 'todo', due_date = null } = body as Record<string, unknown>

    if (!classification_id || typeof classification_id !== 'string') {
      return NextResponse.json({ error: 'classification_id is required' }, { status: 400 })
    }
    if (!task || typeof task !== 'string' || !task.trim()) {
      return NextResponse.json({ error: 'task is required and must be a non-empty string' }, { status: 400 })
    }

    const validStatuses: ComplianceTaskStatus[] = ['todo', 'in_progress', 'done']
    if (!validStatuses.includes(status as ComplianceTaskStatus)) {
      return NextResponse.json({
        error: `status must be one of: ${validStatuses.join(', ')}`,
      }, { status: 400 })
    }

    const created = await createComplianceTask(userId, {
      classification_id,
      task: task.trim(),
      status: status as ComplianceTaskStatus,
      due_date: typeof due_date === 'string' ? due_date : null,
    })

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[api/compliance-tasks] POST error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── PATCH /api/compliance-tasks?id=<uuid> ──────────────────────────────────
// Update an existing task (task text, status, due_date).
// Ownership is enforced in the DB layer.

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)
    const { searchParams } = request.nextUrl
    const taskId = searchParams.get('id')

    if (!taskId) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const updates: Partial<{ task: string; status: ComplianceTaskStatus; due_date: string | null }> = {}
    const { task, status, due_date } = body as Record<string, unknown>

    if (typeof task === 'string' && task.trim()) updates.task = task.trim()
    if (typeof status === 'string') {
      const validStatuses: ComplianceTaskStatus[] = ['todo', 'in_progress', 'done']
      if (!validStatuses.includes(status as ComplianceTaskStatus)) {
        return NextResponse.json({ error: `status must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
      }
      updates.status = status as ComplianceTaskStatus
    }
    if (due_date !== undefined) {
      updates.due_date = typeof due_date === 'string' ? due_date : null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const updated = await updateComplianceTask(userId, taskId, updates)
    if (!updated) {
      return NextResponse.json({ error: 'Task not found or not owned by user' }, { status: 404 })
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[api/compliance-tasks] PATCH error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── DELETE /api/compliance-tasks?id=<uuid> ─────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)
    const { searchParams } = request.nextUrl
    const taskId = searchParams.get('id')

    if (!taskId) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 })
    }

    const deleted = await deleteComplianceTask(userId, taskId)
    if (!deleted) {
      return NextResponse.json({ error: 'Task not found or not owned by user' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[api/compliance-tasks] DELETE error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
