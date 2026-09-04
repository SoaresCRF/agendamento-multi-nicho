import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CalendarPicker } from './CalendarPicker'

describe('CalendarPicker', () => {
  it('calls onSelectDate with YYYY-MM-DD when a future day is clicked', async () => {
    const onSelectDate = vi.fn()
    render(<CalendarPicker selectedDate="2026-09-15" onSelectDate={onSelectDate} timezone="America/Sao_Paulo" now={new Date('2026-09-01T12:00:00Z')} />)

    await userEvent.click(screen.getByRole('button', { name: '20 de setembro de 2026' }))
    expect(onSelectDate).toHaveBeenCalledWith(expect.stringMatching(/^2026-09-20$/))
  })

  it('does not call onSelectDate for a disabled past day', async () => {
    const onSelectDate = vi.fn()
    render(<CalendarPicker selectedDate="2026-09-15" onSelectDate={onSelectDate} timezone="America/Sao_Paulo" now={new Date('2026-09-15T12:00:00Z')} />)

    const pastDay = screen.getByRole('button', { name: '1 de setembro de 2026 (indisponível)' })
    await userEvent.click(pastDay)
    expect(onSelectDate).not.toHaveBeenCalled()
  })

  it('shows a localized month header and marks the selected day for assistive tech', () => {
    const onSelectDate = vi.fn()
    render(<CalendarPicker selectedDate="2026-09-15" onSelectDate={onSelectDate} timezone="America/Sao_Paulo" now={new Date('2026-09-01T12:00:00Z')} />)

    expect(screen.getByText('Setembro 2026')).toBeInTheDocument()
    const selectedDay = screen.getByRole('button', { name: '15 de setembro de 2026 (selecionado)' })
    expect(selectedDay).toHaveAttribute('aria-current', 'date')
  })
})
