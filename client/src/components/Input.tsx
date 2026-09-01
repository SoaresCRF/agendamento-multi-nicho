import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cx } from '../lib/cx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className, ...props },
  ref
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div className="flex flex-col gap-xxs">
      <label htmlFor={inputId} className="font-sans text-body-sm text-body">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        className={cx(
          'h-11 rounded-md border bg-surface px-[14px] font-sans text-body-md text-ink',
          'focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
          error ? 'border-error' : 'border-hairline',
          className
        )}
        {...props}
      />
      {error && <span className="font-sans text-body-sm text-error">{error}</span>}
    </div>
  )
})
