'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ComplianceTask, ComplianceTaskStatus } from '@/lib/types'
import { getAccessToken } from '@/lib/auth/client'

// ── Status badge ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ComplianceTaskStatus, string> = {
  todo:        'bg-gray-100 text-gray-600',
  in_progress: 'bg-amber-100 text-amber-700',
  done:        'bg-green-100 text-green-700',
}

const STATUS_LABELS: Record<ComplianceTaskStatus, string> = {
  todo:        'To do',
  in_progress: 'In progress',
  done:        'Done',
}

const NEXT_STATUS: Record<ComplianceTaskStatus, ComplianceTaskStatus> = {
  todo:        'in_progress',
  in_progress: 'done',
  done:        'todo',
}

// ── API helpers ─────────────────────────────────────────────────────────────

async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = await getAccessToken()
  return fetch(path, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

// ── Task row ────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onStatusChange,
  onDelete,
}: {
  task: ComplianceTask
  onStatusChange: (id: string, status: ComplianceTaskStatus) => void
  onDelete: (id: string) => void
}) {
  const isDone = task.status === 'done'
  return (
    <div className={`flex items-start gap-3 py-2.5 px-3 rounded-lg transition-colors ${isDone ? 'bg-gray-50 opacity-70' : 'bg-white hover:bg-gray-50'} border border-gray-100`}>
      {/* Checkbox advances status */}
      <button
        type="button"
        onClick={() => onStatusChange(task.id, NEXT_STATUS[task.status])}
        className={`mt-0.5 shrink-0 w-4 h-4 rounded border-2 transition-colors ${
          isDone
            ? 'bg-green-500 border-green-500'
            : task.status === 'in_progress'
            ? 'bg-amber-400 border-amber-400'
            : 'border-gray-300 hover:border-gray-500'
        } flex items-center justify-center`}
        title={`Mark as ${STATUS_LABELS[NEXT_STATUS[task.status]]}`}
      >
        {isDone && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5.5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {task.status === 'in_progress' && (
          <div className="w-1.5 h-1.5 rounded-sm bg-white" />
        )}
      </button>

      {/* Task text + metadata */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {task.task}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_STYLES[task.status]}`}>
            {STATUS_LABELS[task.status]}
          </span>
          {task.due_date && (
            <span className={`text-[10px] ${new Date(task.due_date) < new Date() && !isDone ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              Due {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        className="shrink-0 text-gray-300 hover:text-red-400 transition-colors text-xs mt-0.5"
        title="Delete task"
      >
        ✕
      </button>
    </div>
  )
}

// ── Add task form ───────────────────────────────────────────────────────────

function AddTaskForm({
  onAdd,
  loading,
}: {
  onAdd: (task: string, dueDate: string) => void
  loading: boolean
}) {
  const [taskText, setTaskText] = useState('')
  const [dueDate, setDueDate] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskText.trim()) return
    onAdd(taskText.trim(), dueDate)
    setTaskText('')
    setDueDate('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2 border-t border-gray-100">
      <input
        type="text"
        value={taskText}
        onChange={(e) => setTaskText(e.target.value)}
        placeholder="Add a compliance task…"
        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        title="Due date (optional)"
      />
      <button
        type="submit"
        disabled={loading || !taskText.trim()}
        className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm font-medium
          hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Add
      </button>
    </form>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export interface ComplianceTaskListProps {
  classificationId: string
  /** Passed for context / future deeplinks; not used in current render logic */
  classificationSlug?: string
  /** AI-suggested task strings from scope_summary.compliance_tasks */
  suggestedTasks?: string[]
  /**
   * Hint from the server about whether a user is logged in.
   * The component also detects auth client-side on mount, so this prop is
   * only used as the initial default while the token check is in flight.
   */
  isAuthenticated?: boolean
}

export function ComplianceTaskList({
  classificationId,
  suggestedTasks = [],
  isAuthenticated: isAuthenticatedProp = false,
}: ComplianceTaskListProps) {
  const [tasks, setTasks] = useState<ComplianceTask[]>([])
  const [adding, setAdding] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Client-side auth detection overrides the server-rendered prop
  const [authDetected, setAuthDetected] = useState(isAuthenticatedProp)
  const [authChecked, setAuthChecked] = useState(false)

  // ── Load tasks from the API ───────────────────────────────────────────────
  const reloadTasks = useCallback(async () => {
    try {
      const res = await apiFetch(
        `/api/compliance-tasks?classification_id=${classificationId}`
      )
      if (res.ok) {
        const json = await res.json()
        setTasks(json.data ?? [])
      }
    } catch {
      // Non-fatal — keep current tasks
    }
  }, [classificationId])

  // ── Detect auth state on mount, then load tasks if signed in ─────────────
  useEffect(() => {
    let cancelled = false

    async function init() {
      const token = await getAccessToken()
      if (cancelled) return

      if (token) {
        setAuthDetected(true)
        await reloadTasks()
      }

      if (!cancelled) setAuthChecked(true)
    }

    init()
    return () => { cancelled = true }
  }, [reloadTasks])

  const handleAddTask = useCallback(async (task: string, dueDate: string) => {
    setAdding(true)
    setLoadError(null)
    try {
      const res = await apiFetch('/api/compliance-tasks', {
        method: 'POST',
        body: JSON.stringify({
          classification_id: classificationId,
          task,
          status: 'todo',
          due_date: dueDate || null,
        }),
      })
      if (res.ok) {
        await reloadTasks()
      } else {
        const json = await res.json().catch(() => ({}))
        setLoadError(json.error ?? 'Failed to add task')
      }
    } catch {
      setLoadError('Network error — please try again')
    } finally {
      setAdding(false)
    }
  }, [classificationId, reloadTasks])

  const handleStatusChange = useCallback(async (id: string, status: ComplianceTaskStatus) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t))
    try {
      const res = await apiFetch(`/api/compliance-tasks?id=${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      if (!res.ok) await reloadTasks()
    } catch {
      await reloadTasks()
    }
  }, [reloadTasks])

  const handleDelete = useCallback(async (id: string) => {
    // Optimistic update
    setTasks((prev) => prev.filter((t) => t.id !== id))
    try {
      await apiFetch(`/api/compliance-tasks?id=${id}`, { method: 'DELETE' })
    } catch {
      await reloadTasks()
    }
  }, [reloadTasks])

  const handleAddSuggested = useCallback(async (suggestion: string) => {
    await handleAddTask(suggestion, '')
  }, [handleAddTask])

  const todoCount = tasks.filter((t) => t.status === 'todo').length
  const doneCount = tasks.filter((t) => t.status === 'done').length

  // While we're still checking auth, show a neutral loading state
  if (!authChecked) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-400">Loading tasks…</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            ✅ My compliance tasks
            {tasks.length > 0 && (
              <span className="text-xs font-normal text-gray-400">
                {doneCount}/{tasks.length} done
              </span>
            )}
          </h3>
        </div>
        {tasks.length > 0 && (
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0}%` }}
            />
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="p-4 space-y-2">
        {loadError && (
          <p className="text-xs text-red-500 mb-2">{loadError}</p>
        )}

        {!authDetected && (
          <p className="text-sm text-gray-400 text-center py-4">
            <a href="/auth/sign-in" className="text-brand-600 hover:underline">Sign in</a> to track your compliance tasks.
          </p>
        )}

        {authDetected && tasks.length === 0 && (
          <p className="text-sm text-gray-400 py-2">
            No tasks yet — add one below or import from the suggested list.
          </p>
        )}

        {/* Sort: todo/in_progress first, done last */}
        {[...tasks]
          .sort((a, b) => {
            const order: Record<ComplianceTaskStatus, number> = { todo: 0, in_progress: 1, done: 2 }
            return order[a.status] - order[b.status]
          })
          .map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}

        {/* Add form (only when authenticated) */}
        {authDetected && (
          <AddTaskForm onAdd={handleAddTask} loading={adding} />
        )}
      </div>

      {/* Suggested tasks from scope summary */}
      {authDetected && suggestedTasks.length > 0 && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <p className="text-xs font-medium text-gray-500 mb-2">
            AI-suggested tasks — click to add:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedTasks.map((s) => {
              const alreadyAdded = tasks.some((t) => t.task === s)
              return (
                <button
                  key={s}
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => handleAddSuggested(s)}
                  className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                    alreadyAdded
                      ? 'border-green-200 bg-green-50 text-green-600 cursor-default'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700'
                  }`}
                >
                  {alreadyAdded ? '✓ ' : '+ '}{s}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
