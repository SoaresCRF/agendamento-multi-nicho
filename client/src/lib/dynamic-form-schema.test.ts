import { describe, it, expect } from 'vitest'
import { buildCustomFieldsSchema } from './dynamic-form-schema'
import type { ServiceTypeCustomField } from './types'

const baseField: ServiceTypeCustomField = {
  id: 'f1',
  serviceTypeId: 'st1',
  label: 'Queixa principal',
  fieldType: 'TEXT',
  required: true,
  order: 0,
  options: null,
}

describe('buildCustomFieldsSchema', () => {
  it('rejects a missing required field', () => {
    const schema = buildCustomFieldsSchema([baseField])
    const result = schema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('accepts an optional field left out', () => {
    const schema = buildCustomFieldsSchema([{ ...baseField, required: false }])
    const result = schema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('coerces NUMBER fields and rejects non-numeric strings', () => {
    const schema = buildCustomFieldsSchema([{ ...baseField, fieldType: 'NUMBER' }])
    expect(schema.safeParse({ f1: '42' }).success).toBe(true)
    expect(schema.safeParse({ f1: 'abc' }).success).toBe(false)
  })

  it('only accepts one of the configured SELECT options', () => {
    const schema = buildCustomFieldsSchema([{ ...baseField, fieldType: 'SELECT', options: ['Sim', 'Não'] }])
    expect(schema.safeParse({ f1: 'Sim' }).success).toBe(true)
    expect(schema.safeParse({ f1: 'Talvez' }).success).toBe(false)
  })

  it('fails validation instead of throwing for a malformed server fieldType', () => {
    const malformed = { ...baseField, fieldType: 'DATE' } as unknown as ServiceTypeCustomField
    const schema = buildCustomFieldsSchema([malformed])
    expect(() => schema.safeParse({ f1: 'qualquer coisa' })).not.toThrow()
    expect(schema.safeParse({ f1: 'qualquer coisa' }).success).toBe(false)
  })
})
