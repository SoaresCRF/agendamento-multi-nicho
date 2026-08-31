import type { ButtonHTMLAttributes } from 'react'
import { cx } from '../lib/cx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text-link'
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={cx(
        'font-sans text-button transition-colors disabled:cursor-not-allowed',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        variant === 'primary' &&
          'bg-primary text-on-primary rounded-pill px-[22px] h-11 hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted',
        variant === 'secondary' &&
          'bg-surface text-ink rounded-pill px-[22px] h-11 border border-hairline hover:bg-surface-soft disabled:opacity-50',
        variant === 'text-link' && 'bg-transparent text-primary hover:underline disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}
