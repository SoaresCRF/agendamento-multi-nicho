import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ToastProvider } from './ToastProvider'
import { useToast } from './useToast'

function TriggerButton() {
  const { show } = useToast()
  return <button onClick={() => show('Alterações salvas', 'success')}>disparar</button>
}

describe('ToastProvider', () => {
  it('shows a toast message when show() is called, and it disappears after the timeout', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <TriggerButton />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText('disparar'))
    expect(screen.getByText('Alterações salvas')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(4000)
      vi.runAllTimers()
    })
    expect(screen.queryByText('Alterações salvas')).not.toBeInTheDocument()
    vi.useRealTimers()
  })
})
