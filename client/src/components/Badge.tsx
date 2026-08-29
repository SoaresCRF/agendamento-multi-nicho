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
        tone === 'confirmed' && 'bg-[#e3f6ef] text-success',
        tone === 'cancelled' && 'bg-[#fbeae8] text-error',
        className
      )}
      {...props}
    />
  )
}
