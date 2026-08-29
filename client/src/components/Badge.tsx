import type { HTMLAttributes } from 'react'
import { cx } from '../lib/cx'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'confirmed' | 'cancelled'
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-block rounded-pill px-[10px] py-[4px] font-sans text-caption',
        tone === 'neutral' && 'bg-surface-soft text-body',
        tone === 'confirmed' && 'bg-badge-confirmed-bg text-success',
        tone === 'cancelled' && 'bg-badge-cancelled-bg text-error',
        className
      )}
      {...props}
    />
  )
}
