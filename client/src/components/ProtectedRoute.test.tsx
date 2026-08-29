import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuth } from '../lib/auth-context'

vi.mock('../lib/auth-context', () => ({ useAuth: vi.fn() }))
const mockedUseAuth = vi.mocked(useAuth)

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>tela de login</div>} />
        <Route
          path="/painel"
          element={
            <ProtectedRoute>
              <div>painel protegido</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('shows a loading screen while the auth bootstrap is in flight', () => {
    mockedUseAuth.mockReturnValue({ user: null, accessToken: null, isLoading: true, login: vi.fn(), logout: vi.fn() })
    renderAt('/painel')
    expect(screen.getByText('Carregando…')).toBeInTheDocument()
  })

  it('redirects to /login when not authenticated', () => {
    mockedUseAuth.mockReturnValue({ user: null, accessToken: null, isLoading: false, login: vi.fn(), logout: vi.fn() })
    renderAt('/painel')
    expect(screen.getByText('tela de login')).toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    mockedUseAuth.mockReturnValue({
      user: { id: '1', name: 'Joana', email: 'j@x.com', slug: 'joana' },
      accessToken: 'tok',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    })
    renderAt('/painel')
    expect(screen.getByText('painel protegido')).toBeInTheDocument()
  })
})
