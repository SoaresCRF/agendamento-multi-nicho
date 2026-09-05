import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { PublicBookingPage } from './PublicBookingPage'

const profile = { name: 'Joana Silva', niche: 'Psicologia', timezone: 'America/Sao_Paulo' }
const serviceTypes = [
  {
    id: 'st1',
    name: 'Primeira consulta',
    durationMinutes: 60,
    description: null,
    requiresCustomForm: false,
    customFields: [],
  },
]

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/joana-psicologa']}>
        <Routes>
          <Route path="/:slug" element={<PublicBookingPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PublicBookingPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows the hero band and lets the client pick a service type', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.endsWith('/service-types')) {
        return Promise.resolve(new Response(JSON.stringify(serviceTypes), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify(profile), { status: 200 }))
    }) as unknown as typeof fetch

    renderPage()

    expect(await screen.findByText('Joana Silva')).toBeInTheDocument()
    expect(screen.getByText('Psicologia')).toBeInTheDocument()
    expect(await screen.findByText('Primeira consulta')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Primeira consulta'))
    expect(await screen.findByText(/Escolha um horário/)).toBeInTheDocument()
  })

  it('walks the client from slot selection through a successful booking submission', async () => {
    let bookingPosted = false
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === 'string' && url.endsWith('/service-types')) {
        return Promise.resolve(new Response(JSON.stringify(serviceTypes), { status: 200 }))
      }
      if (typeof url === 'string' && url.includes('/slots')) {
        return Promise.resolve(new Response(JSON.stringify({ slots: ['2026-09-20T13:00:00.000Z'] }), { status: 200 }))
      }
      if (typeof url === 'string' && url.includes('/bookings')) {
        bookingPosted = true
        expect(JSON.parse(init!.body as string)).toMatchObject({
          serviceTypeId: 'st1',
          startsAt: '2026-09-20T13:00:00.000Z',
          clientName: 'Cliente Teste',
          clientEmail: 'cliente@example.com',
        })
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'b1',
              startsAt: '2026-09-20T13:00:00.000Z',
              endsAt: '2026-09-20T14:00:00.000Z',
              status: 'CONFIRMED',
            }),
            { status: 201 },
          ),
        )
      }
      return Promise.resolve(new Response(JSON.stringify(profile), { status: 200 }))
    }) as unknown as typeof fetch

    renderPage()

    await userEvent.click(await screen.findByText('Primeira consulta'))
    const slotButton = await screen.findByRole('button', { name: '10:00' }) // 13:00 UTC = 10:00 -03:00
    await userEvent.click(slotButton)

    await userEvent.type(await screen.findByLabelText('Nome'), 'Cliente Teste')
    await userEvent.type(screen.getByLabelText('E-mail'), 'cliente@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar agendamento' }))

    expect(await screen.findByText('Agendamento confirmado!')).toBeInTheDocument()
    expect(bookingPosted).toBe(true)
  })

  it('carries a summary of the chosen service, date and time from the form step through confirmation', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.endsWith('/service-types')) {
        return Promise.resolve(new Response(JSON.stringify(serviceTypes), { status: 200 }))
      }
      if (typeof url === 'string' && url.includes('/slots')) {
        return Promise.resolve(new Response(JSON.stringify({ slots: ['2026-09-20T13:00:00.000Z'] }), { status: 200 }))
      }
      if (typeof url === 'string' && url.includes('/bookings')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'b1',
              startsAt: '2026-09-20T13:00:00.000Z',
              endsAt: '2026-09-20T14:00:00.000Z',
              status: 'CONFIRMED',
            }),
            { status: 201 },
          ),
        )
      }
      return Promise.resolve(new Response(JSON.stringify(profile), { status: 200 }))
    }) as unknown as typeof fetch

    renderPage()

    await userEvent.click(await screen.findByText('Primeira consulta'))
    await userEvent.click(await screen.findByRole('button', { name: '10:00' })) // 13:00 UTC = 10:00 -03:00

    expect(await screen.findByText('60 min')).toBeInTheDocument()
    expect(screen.getByText(/20 de setembro de 2026/)).toBeInTheDocument()
    expect(screen.getByText(/10:00/)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Nome'), 'Cliente Teste')
    await userEvent.type(screen.getByLabelText('E-mail'), 'cliente@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar agendamento' }))

    expect(await screen.findByText('Agendamento confirmado!')).toBeInTheDocument()
    expect(screen.getByText('60 min')).toBeInTheDocument()
    expect(screen.getByText(/20 de setembro de 2026/)).toBeInTheDocument()
  })

  it('shows the conflict error and returns to the slot picker when booking gets a 409', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.endsWith('/service-types')) {
        return Promise.resolve(new Response(JSON.stringify(serviceTypes), { status: 200 }))
      }
      if (typeof url === 'string' && url.includes('/slots')) {
        return Promise.resolve(new Response(JSON.stringify({ slots: ['2026-09-20T13:00:00.000Z'] }), { status: 200 }))
      }
      if (typeof url === 'string' && url.includes('/bookings')) {
        return Promise.resolve(new Response(JSON.stringify({ error: 'Slot already booked' }), { status: 409 }))
      }
      return Promise.resolve(new Response(JSON.stringify(profile), { status: 200 }))
    }) as unknown as typeof fetch

    renderPage()

    await userEvent.click(await screen.findByText('Primeira consulta'))
    const slotButton = await screen.findByRole('button', { name: '10:00' }) // 13:00 UTC = 10:00 -03:00
    await userEvent.click(slotButton)

    await userEvent.type(await screen.findByLabelText('Nome'), 'Cliente Teste')
    await userEvent.type(screen.getByLabelText('E-mail'), 'cliente@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar agendamento' }))

    expect(await screen.findByText('Esse horário acabou de ser reservado — escolha outro.')).toBeInTheDocument()
    expect(await screen.findByText(/Escolha um horário/)).toBeInTheDocument()
  })

  it('shows a not-found message instead of a blank page for an invalid slug', async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve(new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }))
    }) as unknown as typeof fetch

    renderPage()

    expect(await screen.findByText('Página não encontrada')).toBeInTheDocument()
    expect(screen.queryByText('Joana Silva')).not.toBeInTheDocument()
  })
})
