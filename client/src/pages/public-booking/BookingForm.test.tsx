import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BookingForm } from './BookingForm'
import type { PublicServiceType } from '../../lib/types'

const serviceType: PublicServiceType = {
  id: 'st1',
  name: 'Primeira consulta',
  durationMinutes: 60,
  description: null,
  requiresCustomForm: true,
  customFields: [
    {
      id: 'f1',
      serviceTypeId: 'st1',
      label: 'Queixa principal',
      fieldType: 'TEXT',
      required: true,
      order: 0,
      options: null,
    },
  ],
}

describe('BookingForm', () => {
  it('validates fixed fields and dynamic custom fields together before calling onSubmit', async () => {
    const onSubmit = vi.fn()
    render(
      <BookingForm serviceType={serviceType} professionalName="Joana Silva" onSubmit={onSubmit} isSubmitting={false} />,
    )

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
        {
          id: 'f1',
          serviceTypeId: 'st1',
          label: 'Convênio',
          fieldType: 'SELECT',
          required: true,
          order: 0,
          options: ['Particular', 'Unimed'],
        },
      ],
    }
    render(
      <BookingForm
        serviceType={selectServiceType}
        professionalName="Joana Silva"
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    )

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

  it('links a SELECT custom field error to the select via aria-describedby, for screen readers', async () => {
    const selectServiceType: PublicServiceType = {
      ...serviceType,
      customFields: [
        {
          id: 'f1',
          serviceTypeId: 'st1',
          label: 'Convênio',
          fieldType: 'SELECT',
          required: true,
          order: 0,
          options: ['Particular', 'Unimed'],
        },
      ],
    }
    render(
      <BookingForm
        serviceType={selectServiceType}
        professionalName="Joana Silva"
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar agendamento' }))

    const select = await screen.findByLabelText('Convênio')
    const describedById = select.getAttribute('aria-describedby')
    expect(describedById).toBeTruthy()
    expect(screen.getByText('O campo "Convênio" tem um valor inválido')).toHaveAttribute('id', describedById!)
  })

  it('shows a confidentiality note naming the professional before clinical custom fields, and not otherwise', () => {
    const { rerender } = render(
      <BookingForm serviceType={serviceType} professionalName="Joana Silva" onSubmit={vi.fn()} isSubmitting={false} />,
    )
    expect(screen.getByText(/Joana Silva/)).toBeInTheDocument()
    expect(screen.getByText(/confidencia/i)).toBeInTheDocument()

    const noCustomFieldsServiceType: PublicServiceType = { ...serviceType, customFields: [] }
    rerender(
      <BookingForm
        serviceType={noCustomFieldsServiceType}
        professionalName="Joana Silva"
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    )
    expect(screen.queryByText(/confidencia/i)).not.toBeInTheDocument()
  })

  it('renders a TEXTAREA custom field as an actual <textarea>, not a single-line input', () => {
    const textareaServiceType: PublicServiceType = {
      ...serviceType,
      customFields: [
        {
          id: 'f1',
          serviceTypeId: 'st1',
          label: 'Queixa principal',
          fieldType: 'TEXTAREA',
          required: true,
          order: 0,
          options: null,
        },
      ],
    }
    render(
      <BookingForm
        serviceType={textareaServiceType}
        professionalName="Joana Silva"
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    )
    expect(screen.getByLabelText('Queixa principal').tagName).toBe('TEXTAREA')
  })
})
