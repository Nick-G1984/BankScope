/**
 * Database operations for compliance_tasks.
 * These tasks are user-owned and use the admin client (service role).
 * Auth is always enforced at the API route layer before calling these functions.
 */

import { createAdminClient } from './client'
import type { ComplianceTask, ComplianceTaskInsert, ComplianceTaskStatus } from '../types'

// ── Read ────────────────────────────────────────────────────────────────────

/**
 * Fetch all compliance tasks for a user, optionally filtered by classification.
 * Ordered by status (todo → in_progress → done), then due_date ASC NULLS LAST.
 */
export async function getUserComplianceTasks(
  userId: string,
  classificationId?: string
): Promise<ComplianceTask[]> {
  const db = createAdminClient()
  let query = db
    .from('compliance_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (classificationId) {
    query = query.eq('classification_id', classificationId)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch compliance tasks: ${error.message}`)
  return (data ?? []) as ComplianceTask[]
}

// ── Create ──────────────────────────────────────────────────────────────────

export async function createComplianceTask(
  userId: string,
  task: ComplianceTaskInsert
): Promise<ComplianceTask> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('compliance_tasks')
    .insert({ ...task, user_id: userId })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create compliance task: ${error?.message ?? 'unknown error'}`)
  }
  return data as ComplianceTask
}

// ── Update ──────────────────────────────────────────────────────────────────

/**
 * Update the status of a task.
 * Validates that the task belongs to userId before updating (ownership check).
 */
export async function updateComplianceTaskStatus(
  userId: string,
  taskId: string,
  status: ComplianceTaskStatus
): Promise<ComplianceTask | null> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('compliance_tasks')
    .update({ status })
    .eq('id', taskId)
    .eq('user_id', userId)   // ownership check
    .select()
    .single()

  if (error) return null
  return data as ComplianceTask
}

/**
 * Full update for a compliance task (task text, status, due_date).
 * Enforces ownership via user_id filter.
 */
export async function updateComplianceTask(
  userId: string,
  taskId: string,
  updates: Partial<Pick<ComplianceTask, 'task' | 'status' | 'due_date'>>
): Promise<ComplianceTask | null> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('compliance_tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return null
  return data as ComplianceTask
}

// ── Delete ──────────────────────────────────────────────────────────────────

/**
 * Delete a compliance task. Enforces ownership.
 * Returns true if a row was deleted, false if not found or not owned.
 */
export async function deleteComplianceTask(
  userId: string,
  taskId: string
): Promise<boolean> {
  const db = createAdminClient()
  const { error, count } = await db
    .from('compliance_tasks')
    .delete({ count: 'exact' })
    .eq('id', taskId)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to delete compliance task: ${error.message}`)
  return (count ?? 0) > 0
}
