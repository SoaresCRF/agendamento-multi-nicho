import { useCallback, useState, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { ToastContext } from './useToast'

interface ToastItem {
  id: number
  message: string
  tone: 'success' | 'error'
}

let nextId = 0
const TOAST_DURATION_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, tone }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, TOAST_DURATION_MS)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div role="status" aria-live="polite" className="fixed bottom-lg right-lg z-50 flex flex-col gap-xs">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              'rounded-lg px-md py-sm font-sans text-body-sm shadow-elevated',
              t.tone === 'success' ? 'bg-ink text-on-primary' : 'bg-error text-on-primary',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
