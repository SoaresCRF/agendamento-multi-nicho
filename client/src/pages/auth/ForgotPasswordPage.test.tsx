import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ForgotPasswordPage } from './ForgotPasswordPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  )
}

describe('ForgotPasswordPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sets a page-specific document title', () => {
    renderPage()
    expect(document.title).toBe('Esqueci minha senha · Agendamento')
  })

  it('shows a validation error for an empty submit', async () => {
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: 'Enviar link' }))
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }))
    expect(await screen.findByText('E-mail inválido')).toBeInTheDocument()
  })

  it('shows a generic confirmation message after a successful submit', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ message: 'Se o e-mail existir, enviamos um link.' }), { status: 200 }),
      ) as unknown as typeof fetch

    renderPage()
    await userEvent.type(screen.getByLabelText('E-mail'), 'joana@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(await screen.findByText(/se o e-mail existir/i)).toBeInTheDocument()
  })

  it('shows the server error message on failure', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'Muitas tentativas' }), { status: 429 }),
      ) as unknown as typeof fetch

    renderPage()
    await userEvent.type(screen.getByLabelText('E-mail'), 'joana@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }))

    await waitFor(() => expect(screen.getByText('Muitas tentativas')).toBeInTheDocument())
  })
})
