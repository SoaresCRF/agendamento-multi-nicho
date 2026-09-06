import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { CalendarPicker } from './CalendarPicker'

function renderCalendar({
  onSelectDate = vi.fn(),
  now = new Date('2026-09-01T12:00:00Z'),
  availableDates = [] as string[],
}: { onSelectDate?: (date: string) => void; now?: Date; availableDates?: string[] } = {}) {
  global.fetch = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ availableDates }), { status: 200 })) as unknown as typeof fetch
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <CalendarPicker
        selectedDate="2026-09-15"
        onSelectDate={onSelectDate}
        timezone="America/Sao_Paulo"
        slug="joana-psicologa"
        serviceTypeId="st1"
        now={now}
      />
    </QueryClientProvider>,
  )
  return { onSelectDate }
}

describe('CalendarPicker', () => {
  afterEach(() => vi.restoreAllMocks())

  it('calls onSelectDate with YYYY-MM-DD when a future day is clicked', async () => {
    const { onSelectDate } = renderCalendar()

    await userEvent.click(screen.getByRole('button', { name: '20 de setembro de 2026' }))
    expect(onSelectDate).toHaveBeenCalledWith(expect.stringMatching(/^2026-09-20$/))
  })

  it('does not call onSelectDate for a disabled past day', async () => {
    const { onSelectDate } = renderCalendar({ now: new Date('2026-09-15T12:00:00Z') })

    const pastDay = screen.getByRole('button', { name: '1 de setembro de 2026 (indisponível)' })
    await userEvent.click(pastDay)
    expect(onSelectDate).not.toHaveBeenCalled()
  })

  it('shows a localized month header and marks the selected day for assistive tech', () => {
    renderCalendar()

    expect(screen.getByText('Setembro 2026')).toBeInTheDocument()
    const selectedDay = screen.getByRole('button', { name: '15 de setembro de 2026 (selecionado)' })
    expect(selectedDay).toHaveAttribute('aria-current', 'date')
  })

  it('highlights a day with available slots once the availability data loads, and leaves others alone', async () => {
    renderCalendar({ availableDates: ['2026-09-08'] })

    const availableDay = await screen.findByRole('button', { name: '8 de setembro de 2026 (com horários disponíveis)' })
    expect(availableDay).toHaveClass('bg-primary-soft')

    const unknownDay = screen.getByRole('button', { name: '9 de setembro de 2026' })
    expect(unknownDay).not.toHaveClass('bg-primary-soft')
  })
})
