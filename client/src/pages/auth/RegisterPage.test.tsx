import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { RegisterPage } from './RegisterPage'
import { AuthProvider } from '../../lib/auth-context'
import { ToastProvider } from '../../components/toast/ToastProvider'

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('RegisterPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('rejects a slug with uppercase letters before hitting the server', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 401 })) as unknown as typeof fetch
    renderPage()
    await waitFor(() => screen.getByLabelText('Slug (URL pública)'))
    await userEvent.type(screen.getByLabelText('Slug (URL pública)'), 'Joana-Psicologa')
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText('Use apenas letras minúsculas, números e hífen')).toBeInTheDocument()
  })

  it('submits a valid registration and shows the server 409 on a duplicate', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.endsWith('/api/auth/register')) {
        return Promise.resolve(new Response(JSON.stringify({ error: 'E-mail ou slug já em uso' }), { status: 409 }))
      }
      return Promise.resolve(new Response('{}', { status: 401 }))
    }) as unknown as typeof fetch

    renderPage()
    await waitFor(() => screen.getByLabelText('Nome'))
    await userEvent.type(screen.getByLabelText('Nome'), 'Joana Silva')
    await userEvent.type(screen.getByLabelText('E-mail'), 'joana@example.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'senha1234')
    await userEvent.type(screen.getByLabelText('Slug (URL pública)'), 'joana-psicologa')
    await userEvent.type(screen.getByLabelText('Fuso horário'), 'America/Sao_Paulo')
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('E-mail ou slug já em uso')).toBeInTheDocument()
  })
})
