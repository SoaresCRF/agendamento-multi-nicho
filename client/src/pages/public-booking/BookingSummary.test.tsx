import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BookingSummary } from './BookingSummary'

describe('BookingSummary', () => {
  it('truncates a long service name instead of pushing the date/time out of the card', () => {
    render(
      <BookingSummary
        serviceName="Avaliação psicológica completa com devolutiva e relatório detalhado para encaminhamento"
        durationMinutes={60}
        startsAt="2026-09-20T13:00:00.000Z"
        timezone="America/Sao_Paulo"
      />,
    )

    const serviceName = screen.getByText(/Avaliação psicológica completa/)
    expect(serviceName).toHaveClass('truncate')
    expect(serviceName.parentElement).toHaveClass('min-w-0')
  })
})
