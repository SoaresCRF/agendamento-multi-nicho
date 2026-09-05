import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { LoginPage } from './LoginPage'
import { AuthProvider } from '../../lib/auth-context'
import { ToastProvider } from '../../components/toast/ToastProvider'

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sets a page-specific document title', () => {
    renderPage()
    expect(document.title).toBe('Entrar · Agendamento')
  })

  it('shows validation errors for an empty submit', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 401 })) as unknown as typeof fetch
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: 'Entrar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('E-mail inválido')).toBeInTheDocument()
  })

  it('submits valid credentials and shows the server error on failure', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.endsWith('/api/auth/login')) {
        return Promise.resolve(new Response(JSON.stringify({ error: 'Credenciais inválidas' }), { status: 401 }))
      }
      return Promise.resolve(new Response('{}', { status: 401 }))
    }) as unknown as typeof fetch

    renderPage()
    await waitFor(() => screen.getByLabelText('E-mail'))
    await userEvent.type(screen.getByLabelText('E-mail'), 'joana@example.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'senha1234')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Credenciais inválidas')).toBeInTheDocument()
  })
})
