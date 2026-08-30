import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { PublicBookingPage } from './PublicBookingPage'

const profile = { name: 'Joana Silva', niche: 'Psicologia', timezone: 'America/Sao_Paulo' }
const serviceTypes = [
  { id: 'st1', name: 'Primeira consulta', durationMinutes: 60, description: null, requiresCustomForm: false, customFields: [] },
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
    </QueryClientProvider>
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
})
