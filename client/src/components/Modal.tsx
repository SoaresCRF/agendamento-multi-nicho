import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl bg-surface p-lg shadow-elevated">
        <div className="mb-md flex items-center justify-between">
          <h2 className="font-display text-display-sm">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-muted hover:text-ink">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
