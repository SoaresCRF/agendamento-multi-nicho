import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { buildBookingFormSchema } from '../../lib/dynamic-form-schema'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { Button } from '../../components/Button'
import type { PublicServiceType } from '../../lib/types'

interface BookingFormProps {
  serviceType: PublicServiceType
  professionalName: string
  onSubmit: (values: { clientName: string; clientEmail: string; formResponses: Record<string, unknown> }) => void
  isSubmitting: boolean
}

export function BookingForm({ serviceType, professionalName, onSubmit, isSubmitting }: BookingFormProps) {
  const schema = buildBookingFormSchema(serviceType.customFields)
  type FormValues = z.infer<typeof schema>
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

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
      <Input
        label="Nome"
        id="clientName"
        error={errors.clientName?.message as string | undefined}
        {...register('clientName' as never)}
      />
      <Input
        label="E-mail"
        id="clientEmail"
        type="email"
        error={errors.clientEmail?.message as string | undefined}
        {...register('clientEmail' as never)}
      />

      {serviceType.customFields.length > 0 && (
        <div className="flex flex-col gap-md border-t border-hairline pt-md">
          <div>
            <h3 className="font-sans text-title-sm text-ink">Para te atender melhor</h3>
            <p className="mt-xxs font-sans text-body-sm text-muted">
              Essas informações ajudam {professionalName} a se preparar para o seu atendimento. Suas respostas são
              confidenciais.
            </p>
          </div>

          {serviceType.customFields.map((field) =>
            field.fieldType === 'SELECT' ? (
              <div key={field.id} className="flex flex-col gap-xxs">
                <label htmlFor={field.id} className="font-sans text-body-sm text-body">
                  {field.label}
                </label>
                <select
                  id={field.id}
                  defaultValue=""
                  aria-invalid={errors[field.id] ? 'true' : undefined}
                  aria-describedby={errors[field.id] ? `${field.id}-error` : undefined}
                  className="h-11 rounded-md border border-hairline bg-surface px-[14px] font-sans text-body-md text-ink focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                  {...register(field.id as never)}
                >
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors[field.id] && (
                  <span id={`${field.id}-error`} className="font-sans text-body-sm text-error">
                    {errors[field.id]?.message as string}
                  </span>
                )}
              </div>
            ) : field.fieldType === 'TEXTAREA' ? (
              <Textarea
                key={field.id}
                label={field.label}
                id={field.id}
                error={errors[field.id]?.message as string | undefined}
                {...register(field.id as never)}
              />
            ) : (
              <Input
                key={field.id}
                label={field.label}
                id={field.id}
                type={field.fieldType === 'NUMBER' ? 'number' : 'text'}
                error={errors[field.id]?.message as string | undefined}
                {...register(field.id as never)}
              />
            ),
          )}
        </div>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Enviando…' : 'Confirmar agendamento'}
      </Button>
    </form>
  )
}
