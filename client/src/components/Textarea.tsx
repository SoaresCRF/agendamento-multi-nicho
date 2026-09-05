import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'
import { cx } from '../lib/cx'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, id, className, rows = 4, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div className="flex flex-col gap-xxs">
      <label htmlFor={inputId} className="font-sans text-body-sm text-body">
        {label}
      </label>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={error ? 'true' : undefined}
        className={cx(
          'rounded-md border bg-surface px-[14px] py-sm font-sans text-body-md text-ink',
          'focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
          error ? 'border-error' : 'border-hairline',
          className,
        )}
        {...props}
      />
      {error && <span className="font-sans text-body-sm text-error">{error}</span>}
    </div>
  )
})
