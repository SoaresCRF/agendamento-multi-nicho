import { z } from 'zod'
import type { ServiceTypeCustomField } from './types'

// Mirrors server/src/modules/bookings/form-validation.ts's validateFormResponses
// exactly: required check, per-fieldType check, SELECT restricted to `options`.
export function buildCustomFieldsSchema(fields: ServiceTypeCustomField[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny
    switch (field.fieldType) {
      case 'TEXT':
      case 'TEXTAREA':
        fieldSchema = z.string()
        break
      case 'NUMBER':
        fieldSchema = z.coerce.number({ invalid_type_error: `O campo "${field.label}" deve ser numérico` })
        break
      case 'SELECT': {
        const options = field.options ?? []
        fieldSchema =
          options.length > 0
            ? z.enum(options as [string, ...string[]], { errorMap: () => ({ message: `O campo "${field.label}" tem um valor inválido` }) })
            : z.string().refine(() => false, { message: `O campo "${field.label}" não tem opções configuradas` })
        break
      }
    }
    shape[field.id] = field.required
      ? fieldSchema.refine((v) => v !== undefined && v !== '', { message: `O campo "${field.label}" é obrigatório` })
      : fieldSchema.optional()
  }
  return z.object(shape)
}

export function buildBookingFormSchema(fields: ServiceTypeCustomField[]) {
  return z
    .object({
      clientName: z.string().min(1, 'Nome é obrigatório'),
      clientEmail: z.string().email('E-mail inválido'),
    })
    .merge(buildCustomFieldsSchema(fields))
}
