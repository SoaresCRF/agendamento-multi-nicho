import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // <dialog>.showModal() gives Tab focus-trapping for free. Focus restore-on-close
  // is also native, but only for closes that go through dialog.close() itself —
  // this component closes by unmounting (open flips to false) for every path
  // (X button, in-modal Cancelar/Confirmar, Escape), so restoring focus has to be
  // done here instead, in the effect's cleanup, to cover all of them uniformly.
  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialog?.showModal()
    dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
    return () => previouslyFocused?.focus()
  }, [open])

  if (!open) return null
  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-full max-w-md rounded-xl border-0 bg-surface p-lg shadow-elevated backdrop:bg-black/40"
    >
      <div className="mb-md flex items-center justify-between">
        <h2 className="font-display text-display-sm">{title}</h2>
        <button onClick={onClose} aria-label="Fechar" className="text-muted hover:text-ink">
          ✕
        </button>
      </div>
      {children}
    </dialog>
  )
}
