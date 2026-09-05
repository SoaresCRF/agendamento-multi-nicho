import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ServiceTypesListPage } from './ServiceTypesListPage'
import { ToastProvider } from '../../../components/toast/ToastProvider'

const serviceType = {
  id: 'st1',
  userId: 'u1',
  name: 'Primeira consulta',
  durationMinutes: 60,
  description: null,
  requiresCustomForm: false,
  createdAt: '',
  updatedAt: '',
  customFields: [],
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <ServiceTypesListPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('ServiceTypesListPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows an empty state when there are no service types', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('[]', { status: 200 })) as unknown as typeof fetch
    renderPage()
    expect(await screen.findByText('Nenhum tipo de serviço cadastrado')).toBeInTheDocument()
  })

  it('lists service types and deletes one after confirming', async () => {
    let deleted = false
    global.fetch = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === 'DELETE') {
        deleted = true
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      return Promise.resolve(new Response(JSON.stringify(deleted ? [] : [serviceType]), { status: 200 }))
    }) as unknown as typeof fetch

    renderPage()
    expect(await screen.findByText('Primeira consulta')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))

    await waitFor(() => expect(deleted).toBe(true))
  })
})
