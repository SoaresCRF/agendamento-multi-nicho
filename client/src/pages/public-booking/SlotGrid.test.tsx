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

  it('groups slots into morning/afternoon/evening sections instead of one flat wall of buttons', () => {
    render(
      <SlotGrid
        slots={[
          '2026-09-20T11:00:00.000Z', // 08:00 -03:00 -> Manhã
          '2026-09-20T15:00:00.000Z', // 12:00 -03:00 -> Tarde
          '2026-09-20T22:00:00.000Z', // 19:00 -03:00 -> Noite
        ]}
        selectedSlot={null}
        onSelectSlot={vi.fn()}
        timezone="America/Sao_Paulo"
      />,
    )

    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings).toEqual(['Manhã', 'Tarde', 'Noite'])
    expect(screen.getByRole('button', { name: '08:00' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '12:00' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '19:00' })).toBeInTheDocument()
  })

  it('omits a section heading when no slots fall in that period', () => {
    render(
      <SlotGrid
        slots={['2026-09-20T11:00:00.000Z']} // 08:00 -03:00 -> Manhã only
        selectedSlot={null}
        onSelectSlot={vi.fn()}
        timezone="America/Sao_Paulo"
      />,
    )

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Manhã')
  })
})
