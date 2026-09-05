import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Modal } from './Modal'

function OpenableModal() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Confirmar">
        conteúdo
      </Modal>
    </>
  )
}

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Confirmar">
        conteúdo
      </Modal>,
    )
    expect(screen.queryByText('conteúdo')).not.toBeInTheDocument()
  })

  it('renders the title and children when open, and calls onClose on the close button', async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Confirmar">
        conteúdo
      </Modal>,
    )
    expect(screen.getByText('Confirmar')).toBeInTheDocument()
    expect(screen.getByText('conteúdo')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Confirmar">
        conteúdo
      </Modal>,
    )
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('moves focus into the modal on open and traps Tab within its focusable elements', async () => {
    render(
      <Modal open onClose={vi.fn()} title="Confirmar">
        <button>Voltar</button>
        <button>Confirmar</button>
      </Modal>,
    )
    const closeButton = screen.getByRole('button', { name: 'Fechar' })
    const confirmButton = screen.getByRole('button', { name: 'Confirmar' })

    expect(closeButton).toHaveFocus()

    confirmButton.focus()
    await userEvent.tab()
    expect(closeButton).toHaveFocus() // wraps from last back to first

    await userEvent.tab({ shift: true })
    expect(confirmButton).toHaveFocus() // wraps from first back to last, shift+tab
  })

  it('restores focus to the element that opened it when closed via the close button', async () => {
    render(<OpenableModal />)
    const openButton = screen.getByRole('button', { name: 'Abrir' })

    await userEvent.click(openButton)
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(openButton).toHaveFocus()
  })
})
