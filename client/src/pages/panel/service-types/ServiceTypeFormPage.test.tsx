import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ServiceTypeFormPage } from './ServiceTypeFormPage'
import { ToastProvider } from '../../../components/toast/ToastProvider'

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/painel/tipos-de-servico/:id" element={<ServiceTypeFormPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

describe('ServiceTypeFormPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('creates a service type with two dynamic custom fields', async () => {
    let posted: unknown = null
    global.fetch = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === 'POST') {
        posted = JSON.parse(opts.body as string)
        return Promise.resolve(new Response(JSON.stringify({ id: 'new-id' }), { status: 201 }))
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    }) as unknown as typeof fetch

    renderAt('/painel/tipos-de-servico/novo')

    await userEvent.type(screen.getByLabelText('Nome'), 'Primeira consulta')
    // The form defaults durationMinutes to 30, so the input already shows "30";
    // userEvent.type appends at the cursor rather than replacing, so the field
    // must be cleared first or typing "60" yields "3060". Test-only fix — see
    // task-9-report.md for details (implementation left as specified in the brief).
    await userEvent.clear(screen.getByLabelText('Duração (minutos)'))
    await userEvent.type(screen.getByLabelText('Duração (minutos)'), '60')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Exige formulário customizado' }))
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar campo' }))
    await userEvent.type(screen.getByLabelText('Rótulo do campo 1'), 'Queixa principal')

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(posted).toMatchObject({
      name: 'Primeira consulta',
      durationMinutes: 60,
      requiresCustomForm: true,
      customFields: [{ label: 'Queixa principal', fieldType: 'TEXT', required: false, order: 0 }],
    }))
  })

  it('loads an existing service type in edit mode and pre-fills the form', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'st1', name: 'Sessão', durationMinutes: 50, description: null,
          requiresCustomForm: false, customFields: [],
        }),
        { status: 200 }
      )
    ) as unknown as typeof fetch

    renderAt('/painel/tipos-de-servico/st1')

    expect(await screen.findByDisplayValue('Sessão')).toBeInTheDocument()
    expect(screen.getByDisplayValue('50')).toBeInTheDocument()
  })

  it('loads and saves per-service-type availability rules in edit mode', async () => {
    let putBody: unknown = null
    global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/availability-rules') && opts?.method === 'PUT') {
        putBody = JSON.parse(opts.body as string)
        return Promise.resolve(new Response(JSON.stringify(putBody), { status: 200 }))
      }
      if (typeof url === 'string' && url.includes('/availability-rules')) {
        return Promise.resolve(new Response('[]', { status: 200 }))
      }
      if (typeof url === 'string' && url.endsWith('/api/service-types/st1')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ id: 'st1', name: 'Sessão', durationMinutes: 50, description: null, requiresCustomForm: false, customFields: [] }),
            { status: 200 }
          )
        )
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    }) as unknown as typeof fetch

    renderAt('/painel/tipos-de-servico/st1')
    await screen.findByDisplayValue('Sessão')

    await userEvent.click(screen.getByRole('checkbox', { name: 'Terça-feira' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar regras de disponibilidade' }))

    await waitFor(() => expect(putBody).toEqual([{ dayOfWeek: 2, startTime: '09:00', endTime: '18:00' }]))
  })
})
