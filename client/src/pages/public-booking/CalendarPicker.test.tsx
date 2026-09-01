import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CalendarPicker } from './CalendarPicker'

describe('CalendarPicker', () => {
  it('calls onSelectDate with YYYY-MM-DD when a future day is clicked', async () => {
    const onSelectDate = vi.fn()
    render(<CalendarPicker selectedDate="2026-09-15" onSelectDate={onSelectDate} timezone="America/Sao_Paulo" now={new Date('2026-09-01T12:00:00Z')} />)

    await userEvent.click(screen.getByRole('button', { name: '20' }))
    expect(onSelectDate).toHaveBeenCalledWith(expect.stringMatching(/^2026-09-20$/))
  })

  it('does not call onSelectDate for a disabled past day', async () => {
    const onSelectDate = vi.fn()
    render(<CalendarPicker selectedDate="2026-09-15" onSelectDate={onSelectDate} timezone="America/Sao_Paulo" now={new Date('2026-09-15T12:00:00Z')} />)

    const pastDayButtons = screen.getAllByRole('button', { name: '1' })
    await userEvent.click(pastDayButtons[0])
    expect(onSelectDate).not.toHaveBeenCalled()
  })
})
