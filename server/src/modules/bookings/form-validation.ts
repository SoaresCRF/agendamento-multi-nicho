import { AppError } from '../../lib/errors'

export interface CustomFieldDef {
  id: string
  label: string
  fieldType: 'TEXT' | 'NUMBER' | 'SELECT' | 'TEXTAREA'
  required: boolean
  options: string[] | null
}

export function validateFormResponses(
  fields: CustomFieldDef[],
  responses: Record<string, unknown>,
): Record<string, unknown> {
  const validated: Record<string, unknown> = {}
  for (const field of fields) {
    const value = responses[field.id]
    if (value === undefined || value === null || value === '') {
      if (field.required) throw new AppError(400, `O campo "${field.label}" é obrigatório`)
      continue
    }
    switch (field.fieldType) {
      case 'TEXT':
      case 'TEXTAREA':
        if (typeof value !== 'string') throw new AppError(400, `O campo "${field.label}" deve ser texto`)
        validated[field.id] = value
        break
      case 'NUMBER':
        if (typeof value !== 'number') throw new AppError(400, `O campo "${field.label}" deve ser numérico`)
        validated[field.id] = value
        break
      case 'SELECT':
        if (typeof value !== 'string' || !(field.options ?? []).includes(value)) {
          throw new AppError(400, `O campo "${field.label}" tem um valor inválido`)
        }
        validated[field.id] = value
        break
    }
  }
  return validated
}
