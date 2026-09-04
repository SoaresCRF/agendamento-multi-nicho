import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BookingForm } from './BookingForm'
import type { PublicServiceType } from '../../lib/types'

const serviceType: PublicServiceType = {
  id: 'st1', name: 'Primeira consulta', durationMinutes: 60, description: null,
  requiresCustomForm: true,
  customFields: [{ id: 'f1', serviceTypeId: 'st1', label: 'Queixa principal', fieldType: 'TEXT', required: true, order: 0, options: null }],
}

describe('BookingForm', () => {
  it('validates fixed fields and dynamic custom fields together before calling onSubmit', async () => {
    const onSubmit = vi.fn()
    render(<BookingForm serviceType={serviceType} onSubmit={onSubmit} isSubmitting={false} />)

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar agendamento' }))
    expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('O campo "Queixa principal" é obrigatório')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('Nome'), 'Cliente Teste')
    await userEvent.type(screen.getByLabelText('E-mail'), 'cliente@example.com')
    await userEvent.type(screen.getByLabelText('Queixa principal'), 'Ansiedade')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar agendamento' }))

    expect(onSubmit).toHaveBeenCalledWith({
      clientName: 'Cliente Teste',
      clientEmail: 'cliente@example.com',
      formResponses: { f1: 'Ansiedade' },
    })
  })

  it('renders a SELECT custom field as a native <select> with its configured options, not free text', async () => {
    const onSubmit = vi.fn()
    const selectServiceType: PublicServiceType = {
      ...serviceType,
      customFields: [
        { id: 'f1', serviceTypeId: 'st1', label: 'Convênio', fieldType: 'SELECT', required: true, order: 0, options: ['Particular', 'Unimed'] },
      ],
    }
    render(<BookingForm serviceType={selectServiceType} onSubmit={onSubmit} isSubmitting={false} />)

    await userEvent.type(screen.getByLabelText('Nome'), 'Cliente Teste')
    await userEvent.type(screen.getByLabelText('E-mail'), 'cliente@example.com')
    await userEvent.selectOptions(screen.getByLabelText('Convênio'), 'Unimed')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar agendamento' }))

    expect(onSubmit).toHaveBeenCalledWith({
      clientName: 'Cliente Teste',
      clientEmail: 'cliente@example.com',
      formResponses: { f1: 'Unimed' },
    })
  })
})
