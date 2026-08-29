import { forwardRef, type InputHTMLAttributes } from 'react'
import { cx } from '../lib/cx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-xxs">
      <label htmlFor={id} className="font-sans text-body-sm text-body">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? 'true' : undefined}
        className={cx(
          'h-11 rounded-md border bg-surface px-[14px] font-sans text-body-md text-ink',
          'focus:outline-none focus:border-primary',
          error ? 'border-error' : 'border-hairline',
          className
        )}
        {...props}
      />
      {error && <span className="font-sans text-body-sm text-error">{error}</span>}
    </div>
  )
})
