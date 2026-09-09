import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ResetPasswordPage } from './ResetPasswordPage'
import { ToastProvider } from '../../components/toast/ToastProvider'

function renderPage(initialPath = '/redefinir-senha?token=good-token') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ToastProvider>
        <Routes>
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
          <Route path="/login" element={<div>Tela de login</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('ResetPasswordPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sets a page-specific document title', () => {
    renderPage()
    expect(document.title).toBe('Redefinir senha · Agendamento')
  })

  it('shows an error and no form when the URL has no token', () => {
    renderPage('/redefinir-senha')
    expect(screen.getByText(/link inválido/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
  })

  it('rejects a password shorter than 10 characters', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText('Nova senha'), 'short')
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Redefinir senha' }))
    expect(await screen.findByText('A senha precisa ter ao menos 10 caracteres')).toBeInTheDocument()
  })

  it('rejects mismatched passwords', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText('Nova senha'), 'brand-new-password')
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'something-else-entirely')
    await userEvent.click(screen.getByRole('button', { name: 'Redefinir senha' }))
    expect(await screen.findByText('As senhas não coincidem')).toBeInTheDocument()
  })

  it('resets the password and redirects to /login on success', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 })) as unknown as typeof fetch

    renderPage()
    await userEvent.type(screen.getByLabelText('Nova senha'), 'brand-new-password')
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'brand-new-password')
    await userEvent.click(screen.getByRole('button', { name: 'Redefinir senha' }))

    expect(await screen.findByText('Tela de login')).toBeInTheDocument()
  })

  it('shows the server error for an invalid/expired token', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'Link inválido ou expirado' }), { status: 400 }),
      ) as unknown as typeof fetch

    renderPage()
    await userEvent.type(screen.getByLabelText('Nova senha'), 'brand-new-password')
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'brand-new-password')
    await userEvent.click(screen.getByRole('button', { name: 'Redefinir senha' }))

    await waitFor(() => expect(screen.getByText('Link inválido ou expirado')).toBeInTheDocument())
  })
})
