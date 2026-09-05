import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SlotGrid } from './SlotGrid'

describe('SlotGrid', () => {
  it('renders each slot at its local time and calls onSelectSlot with the ISO string', async () => {
    const onSelectSlot = vi.fn()
    render(
      <SlotGrid
        slots={['2026-09-20T13:00:00.000Z']}
        selectedSlot={null}
        onSelectSlot={onSelectSlot}
        timezone="America/Sao_Paulo"
      />,
    )
    const button = screen.getByRole('button', { name: '10:00' }) // 13:00 UTC = 10:00 -03:00
    await userEvent.click(button)
    expect(onSelectSlot).toHaveBeenCalledWith('2026-09-20T13:00:00.000Z')
  })
})
