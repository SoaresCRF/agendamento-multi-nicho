import type { HTMLAttributes } from 'react'
import { cx } from '../lib/cx'

type BadgeTone = 'neutral' | 'confirmed' | 'cancelled' | 'accent-teal' | 'accent-terracotta' | 'accent-lilac'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

// DESIGN.md's three category accents are decorative-only niche colors, never full-saturation
// text — dark ink on all three clears WCAG AA (checked: teal 6.4:1, terracotta 5.6:1, lilac 11.9:1).
const NICHE_TONES = ['accent-teal', 'accent-terracotta', 'accent-lilac'] as const satisfies readonly BadgeTone[]

export function toneForNiche(niche: string): BadgeTone {
  const hash = [...niche].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return NICHE_TONES[hash % NICHE_TONES.length]
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-block rounded-pill px-[10px] py-[4px] font-sans text-caption',
        tone === 'neutral' && 'bg-surface-soft text-body',
        tone === 'confirmed' && 'bg-badge-confirmed-bg text-success',
        tone === 'cancelled' && 'bg-badge-cancelled-bg text-error',
        tone === 'accent-teal' && 'bg-accent-teal text-ink',
        tone === 'accent-terracotta' && 'bg-accent-terracotta text-ink',
        tone === 'accent-lilac' && 'bg-accent-lilac text-ink',
        className
      )}
      {...props}
    />
  )
}
