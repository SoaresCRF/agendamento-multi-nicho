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
    </QueryClientProvider>
  )
}

describe('BlockedSlotsPage', () => {
  afterEach(() => vi.restoreAllMocks())

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
})
