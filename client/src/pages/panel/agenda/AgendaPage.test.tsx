import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { AgendaPage } from './AgendaPage'
import { ToastProvider } from '../../../components/toast/ToastProvider'

const booking = {
  id: 'b1',
  userId: 'u1',
  serviceTypeId: 'st1',
  serviceType: { id: 'st1', name: 'Sessão', durationMinutes: 50 },
  clientName: 'Cliente Teste',
  clientEmail: 'c@x.com',
  startsAt: '2026-09-10T13:00:00.000Z',
  endsAt: '2026-09-10T13:50:00.000Z',
  status: 'CONFIRMED',
  formResponses: null,
  createdAt: '2026-09-01T00:00:00.000Z',
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AgendaPage />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('AgendaPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('lists a booking and cancels it after confirming', async () => {
    let cancelled = false
    global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === 'PATCH') {
        cancelled = true
        return Promise.resolve(new Response(JSON.stringify({ ...booking, status: 'CANCELLED' }), { status: 200 }))
      }
      if (typeof url === 'string' && url.includes('/api/me')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'u1',
              name: 'Pro',
              email: 'pro@example.com',
              slug: 'pro',
              timezone: 'UTC',
              niche: null,
            }),
            { status: 200 },
          ),
        )
      }
      return Promise.resolve(new Response(JSON.stringify({ items: [booking], nextCursor: null }), { status: 200 }))
    }) as unknown as typeof fetch

    renderPage()
    expect(await screen.findByText('Cliente Teste')).toBeInTheDocument()
    expect(screen.getByText(/Sessão/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))

    await waitFor(() => expect(cancelled).toBe(true))
  })

  it('disables the confirm button while the cancel mutation is pending', async () => {
    let resolvePatch: (res: Response) => void
    global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === 'PATCH') {
        return new Promise<Response>((resolve) => {
          resolvePatch = resolve
        })
      }
      if (typeof url === 'string' && url.includes('/api/me')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'u1',
              name: 'Pro',
              email: 'pro@example.com',
              slug: 'pro',
              timezone: 'UTC',
              niche: null,
            }),
            { status: 200 },
          ),
        )
      }
      return Promise.resolve(new Response(JSON.stringify({ items: [booking], nextCursor: null }), { status: 200 }))
    }) as unknown as typeof fetch

    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    const confirmButton = screen.getByRole('button', { name: 'Confirmar cancelamento' })
    await userEvent.click(confirmButton)

    expect(confirmButton).toBeDisabled()
    resolvePatch!(new Response(JSON.stringify({ ...booking, status: 'CANCELLED' }), { status: 200 }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Confirmar cancelamento' })).not.toBeInTheDocument(),
    )
  })

  it('displays booking times converted to the professional timezone, not UTC', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/api/me')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'u1',
              name: 'Pro',
              email: 'pro@example.com',
              slug: 'pro',
              timezone: 'America/Sao_Paulo',
              niche: null,
            }),
            { status: 200 },
          ),
        )
      }
      if (typeof url === 'string' && url.includes('/api/bookings')) {
        return Promise.resolve(new Response(JSON.stringify({ items: [booking], nextCursor: null }), { status: 200 }))
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    }) as unknown as typeof fetch

    renderPage()

    // 13:00 UTC in America/Sao_Paulo (UTC-3) is 10:00 local — the raw-UTC bug would show 13:00 instead.
    expect(await screen.findByText(/10\/09\/2026 10:00/)).toBeInTheDocument()
  })
})
