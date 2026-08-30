import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { PanelLayout } from './PanelLayout'
import { useAuth } from '../../lib/auth-context'

vi.mock('../../lib/auth-context', () => ({ useAuth: vi.fn() }))
const mockedUseAuth = vi.mocked(useAuth)

describe('PanelLayout', () => {
  it('shows the sidebar nav links and the logged-in professional name', () => {
    mockedUseAuth.mockReturnValue({
      user: { id: '1', name: 'Joana Silva', email: 'j@x.com', slug: 'joana' },
      accessToken: 'tok',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/painel']}>
        <Routes>
          <Route path="/painel" element={<PanelLayout />}>
            <Route index element={<div>conteúdo</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Tipos de Serviço')).toBeInTheDocument()
    expect(screen.getByText('Disponibilidade')).toBeInTheDocument()
    expect(screen.getByText('Bloqueios')).toBeInTheDocument()
    expect(screen.getByText('Agenda')).toBeInTheDocument()
    expect(screen.getByText('Joana Silva')).toBeInTheDocument()
    expect(screen.getByText('conteúdo')).toBeInTheDocument()
  })

  it('calls logout when "Sair" is clicked', async () => {
    const logout = vi.fn()
    mockedUseAuth.mockReturnValue({
      user: { id: '1', name: 'Joana', email: 'j@x.com', slug: 'joana' },
      accessToken: 'tok',
      isLoading: false,
      login: vi.fn(),
      logout,
    })
    const { default: userEvent } = await import('@testing-library/user-event')
    render(
      <MemoryRouter initialEntries={['/painel']}>
        <Routes>
          <Route path="/painel" element={<PanelLayout />}>
            <Route index element={<div>conteúdo</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(logout).toHaveBeenCalledOnce()
  })
})
