import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-md rounded-xl bg-canvas p-xxl text-center">
      <p className="font-sans text-body-md text-ink">{title}</p>
      {description && <p className="font-sans text-body-sm text-muted">{description}</p>}
      {action}
    </div>
  )
}
