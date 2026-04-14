import { clsx } from 'clsx'
import type { Urgency } from '@/lib/types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'urgency' | 'tag' | 'source' | 'status' | 'content'
  urgency?: Urgency
  className?: string
}

export function Badge({ children, variant = 'tag', urgency, className }: BadgeProps) {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'

  const variantClass = (() => {
    if (variant === 'urgency' && urgency) {
      return {
        critical: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/20',
        high: 'bg-orange-100 text-orange-800 ring-1 ring-inset ring-orange-600/20',
        medium: 'bg-yellow-100 text-yellow-800 ring-1 ring-inset ring-yellow-600/20',
        low: 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-500/20',
      }[urgency]
    }
    if (variant === 'source') return 'bg-brand-100 text-brand-800 ring-1 ring-inset ring-brand-600/20'
    if (variant === 'content') return 'bg-purple-100 text-purple-800 ring-1 ring-inset ring-purple-600/20'
    if (variant === 'status') return 'bg-green-100 text-green-800 ring-1 ring-inset ring-green-600/20'
    return 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-500/20'
  })()

  return (
    <span className={clsx(base, variantClass, className)}>
      {children}
    </span>
  )
}

export function UrgencyDot({ urgency }: { urgency: Urgency }) {
  const colours = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-gray-400',
  }
  return (
    <span className={clsx('inline-block w-2 h-2 rounded-full flex-shrink-0', colours[urgency])} />
  )
}
