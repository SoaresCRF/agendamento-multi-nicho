import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { PanelLayout } from './PanelLayout'
import { useAuth } from '../../lib/auth-context'

vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }))
const mockedUseAuth = vi.mocked(useAuth)

function mockMe(overrides: Partial<{ profilePhotoUrl: string | null }> = {}) {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('/api/me')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: '1',
            name: 'Joana Silva',
            email: 'j@x.com',
            slug: 'joana',
            timezone: 'America/Sao_Paulo',
            niche: null,
            profilePhotoUrl: null,
            bio: null,
            ...overrides,
          }),
          { status: 200 },
        ),
      )
    }
    return Promise.resolve(new Response('[]', { status: 200 }))
  }) as unknown as typeof fetch
}

function renderLayout(initialEntries = ['/painel'], extraRoutes?: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/painel" element={<PanelLayout />}>
            <Route index element={<div>conteúdo</div>} />
            {extraRoutes}
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PanelLayout', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows the sidebar nav links and the logged-in professional name', () => {
    mockMe()
    mockedUseAuth.mockReturnValue({
      user: { id: '1', name: 'Joana Silva', email: 'j@x.com', slug: 'joana' },
      accessToken: 'tok',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    })

    renderLayout()

    expect(screen.getByText('Tipos de Serviço')).toBeInTheDocument()
    expect(screen.getByText('Disponibilidade')).toBeInTheDocument()
    expect(screen.getByText('Bloqueios')).toBeInTheDocument()
    expect(screen.getByText('Agenda')).toBeInTheDocument()
    expect(screen.getByText('Joana Silva')).toBeInTheDocument()
    expect(screen.getByText('conteúdo')).toBeInTheDocument()
  })

  it('shows the profile photo next to the name when one is set', async () => {
    mockMe({ profilePhotoUrl: 'https://example.com/photo.jpg' })
    mockedUseAuth.mockReturnValue({
      user: { id: '1', name: 'Joana Silva', email: 'j@x.com', slug: 'joana' },
      accessToken: 'tok',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    })

    renderLayout()

    const photo = await screen.findByRole('presentation', { hidden: true })
    expect(photo).toHaveAttribute('src', 'https://example.com/photo.jpg')
  })

  it('does not render an img when no profile photo is set', () => {
    mockMe({ profilePhotoUrl: null })
    mockedUseAuth.mockReturnValue({
      user: { id: '1', name: 'Joana Silva', email: 'j@x.com', slug: 'joana' },
      accessToken: 'tok',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    })

    renderLayout()

    expect(screen.queryByRole('presentation', { hidden: true })).not.toBeInTheDocument()
  })

  it('mobile nav toggle starts closed and opens the drawer on click', async () => {
    mockMe()
    mockedUseAuth.mockReturnValue({
      user: { id: '1', name: 'Joana Silva', email: 'j@x.com', slug: 'joana' },
      accessToken: 'tok',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    })
    const { default: userEvent } = await import('@testing-library/user-event')
    renderLayout()

    const toggle = screen.getByRole('button', { name: 'Abrir menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAccessibleName('Fechar menu')
    expect(screen.getAllByText('Tipos de Serviço')).toHaveLength(2)
  })

  it('closes the mobile drawer when a nav link inside it is clicked', async () => {
    mockMe()
    mockedUseAuth.mockReturnValue({
      user: { id: '1', name: 'Joana Silva', email: 'j@x.com', slug: 'joana' },
      accessToken: 'tok',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    })
    const { default: userEvent } = await import('@testing-library/user-event')
    renderLayout(['/painel'], <Route path="perfil" element={<div>perfil</div>} />)

    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    const drawer = document.getElementById('painel-mobile-nav')!
    await userEvent.click(within(drawer).getByText('Perfil'))

    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByText('Tipos de Serviço')).toHaveLength(1)
  })

  it('calls logout when "Sair" is clicked', async () => {
    mockMe()
    const logout = vi.fn()
    mockedUseAuth.mockReturnValue({
      user: { id: '1', name: 'Joana', email: 'j@x.com', slug: 'joana' },
      accessToken: 'tok',
      isLoading: false,
      login: vi.fn(),
      logout,
    })
    const { default: userEvent } = await import('@testing-library/user-event')
    renderLayout()
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(logout).toHaveBeenCalledOnce()
  })
})
