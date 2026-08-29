import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={vi.fn()} title="Confirmar">conteúdo</Modal>)
    expect(screen.queryByText('conteúdo')).not.toBeInTheDocument()
  })

  it('renders the title and children when open, and calls onClose on the close button', async () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Confirmar">conteúdo</Modal>)
    expect(screen.getByText('Confirmar')).toBeInTheDocument()
    expect(screen.getByText('conteúdo')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
