import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { BlockedSlotsPage } from './BlockedSlotsPage'
import { ToastProvider } from '../../../components/toast/ToastProvider'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BlockedSlotsPage />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('BlockedSlotsPage', () => {
  const originalTz = process.env.TZ
  afterEach(() => {
    vi.restoreAllMocks()
    process.env.TZ = originalTz
  })

  it('creates a blocked slot from the form', async () => {
    let posted: unknown = null
    global.fetch = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === 'POST') {
        posted = JSON.parse(opts.body as string)
        return Promise.resolve(new Response(JSON.stringify({ id: 'b1', ...(posted as object) }), { status: 201 }))
      }
      return Promise.resolve(new Response('[]', { status: 200 }))
    }) as unknown as typeof fetch

    renderPage()
    await userEvent.type(screen.getByLabelText('Início'), '2026-12-25T00:00')
    await userEvent.type(screen.getByLabelText('Fim'), '2026-12-26T00:00')
    await userEvent.type(screen.getByLabelText('Motivo (opcional)'), 'Feriado')
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar bloqueio' }))

    await waitFor(() => expect(posted).toMatchObject({ reason: 'Feriado' }))
  })

  it('sends blocked-slot times converted from the professional timezone to UTC, not the browser timezone', async () => {
    // Pin the "browser" clock to a zone deliberately different from the professional's
    // timezone below, so this test fails under browser-local parsing regardless of the
    // host machine's own timezone.
    process.env.TZ = 'Asia/Tokyo'
    let posted: { startsAt?: string; endsAt?: string } | null = null
    global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
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
      if (opts?.method === 'POST') {
        posted = JSON.parse(opts.body as string)
        return Promise.resolve(new Response(JSON.stringify({ id: 'b1', ...(posted as object) }), { status: 201 }))
      }
      return Promise.resolve(new Response('[]', { status: 200 }))
    }) as unknown as typeof fetch

    renderPage()
    await userEvent.type(screen.getByLabelText('Início'), '2026-12-25T09:00')
    await userEvent.type(screen.getByLabelText('Fim'), '2026-12-25T10:00')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Adicionar bloqueio' })).not.toBeDisabled())
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar bloqueio' }))

    // 09:00 in America/Sao_Paulo (UTC-3, no DST since 2019) is 12:00 UTC.
    await waitFor(() =>
      expect(posted).toMatchObject({ startsAt: '2026-12-25T12:00:00.000Z', endsAt: '2026-12-25T13:00:00.000Z' }),
    )
  })

  it('displays blocked-slot times converted to the professional timezone, not UTC', async () => {
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
      if (typeof url === 'string' && url.includes('/api/blocked-slots')) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                id: 'b1',
                userId: 'u1',
                startsAt: '2026-12-25T03:00:00.000Z',
                endsAt: '2026-12-25T04:00:00.000Z',
                reason: 'Feriado',
              },
            ]),
            { status: 200 },
          ),
        )
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    }) as unknown as typeof fetch

    renderPage()

    // 03:00 UTC in America/Sao_Paulo (UTC-3) is 00:00 local — the raw-UTC bug would show 03:00 instead.
    expect(await screen.findByText('25/12/2026 00:00 — 25/12/2026 01:00')).toBeInTheDocument()
  })
})
