import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('associates the label with the input via htmlFor/id', () => {
    render(<Input label="E-mail" id="email" />)
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
  })

  it('still associates the label with the input when no id prop is given', () => {
    render(<Input label="E-mail" />)
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
  })

  it('shows the error message and marks the input invalid', () => {
    render(<Input label="E-mail" id="email" error="E-mail inválido" />)
    expect(screen.getByText('E-mail inválido')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
  })

  it('links the error message to the input via aria-describedby, for screen readers', () => {
    render(<Input label="E-mail" id="email" error="E-mail inválido" />)
    const input = screen.getByLabelText('E-mail')
    const describedById = input.getAttribute('aria-describedby')
    expect(describedById).toBeTruthy()
    expect(screen.getByText('E-mail inválido')).toHaveAttribute('id', describedById!)
  })

  it('has a visible focus ring for keyboard navigation', () => {
    render(<Input label="E-mail" id="email" />)
    expect(screen.getByLabelText('E-mail').className).toContain('focus-visible:ring-primary')
  })
})
