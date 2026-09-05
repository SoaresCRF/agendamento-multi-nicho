import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { WeeklyScheduleEditor } from './WeeklyScheduleEditor'

describe('WeeklyScheduleEditor', () => {
  it('toggling a day on adds a default rule for it, toggling off removes it', async () => {
    const onChange = vi.fn()
    render(<WeeklyScheduleEditor value={[]} onChange={onChange} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Segunda-feira' }))
    expect(onChange).toHaveBeenCalledWith([{ dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }])
  })

  it("editing a start/end time updates that day's rule", async () => {
    const onChange = vi.fn()
    render(
      <WeeklyScheduleEditor value={[{ dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }]} onChange={onChange} />,
    )
    const input = screen.getByLabelText('Início — Segunda-feira') as HTMLInputElement
    fireEvent.change(input, { target: { value: '08:00' } })
    expect(onChange).toHaveBeenLastCalledWith([{ dayOfWeek: 1, startTime: '08:00', endTime: '18:00' }])
  })
})
