import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('associates the label with the input via htmlFor/id', () => {
    render(<Input label="E-mail" id="email" />)
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
  })

  it('shows the error message and marks the input invalid', () => {
    render(<Input label="E-mail" id="email" error="E-mail inválido" />)
    expect(screen.getByText('E-mail inválido')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
  })
})
