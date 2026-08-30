import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { buildBookingFormSchema } from '../../lib/dynamic-form-schema'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import type { PublicServiceType } from '../../lib/types'

interface BookingFormProps {
  serviceType: PublicServiceType
  onSubmit: (values: { clientName: string; clientEmail: string; formResponses: Record<string, unknown> }) => void
  isSubmitting: boolean
}

export function BookingForm({ serviceType, onSubmit, isSubmitting }: BookingFormProps) {
  const schema = buildBookingFormSchema(serviceType.customFields)
  type FormValues = z.infer<typeof schema>
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  function handle(values: FormValues) {
    const { clientName, clientEmail, ...formResponses } = values as {
      clientName: string
      clientEmail: string
      [key: string]: unknown
    }
    onSubmit({ clientName, clientEmail, formResponses })
  }

  return (
    <form onSubmit={handleSubmit(handle)} className="flex flex-col gap-md">
      <Input label="Nome" id="clientName" error={errors.clientName?.message as string | undefined} {...register('clientName' as never)} />
      <Input label="E-mail" id="clientEmail" type="email" error={errors.clientEmail?.message as string | undefined} {...register('clientEmail' as never)} />

      {serviceType.customFields.map((field) => (
        <Input
          key={field.id}
          label={field.label}
          id={field.id}
          type={field.fieldType === 'NUMBER' ? 'number' : 'text'}
          error={errors[field.id]?.message as string | undefined}
          {...register(field.id as never)}
        />
      ))}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Enviando…' : 'Confirmar agendamento'}
      </Button>
    </form>
  )
}
