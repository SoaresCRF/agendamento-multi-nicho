import { describe, it, expect } from 'vitest'
import { validateFormResponses } from './form-validation'

const fields = [
  { id: 'f1', label: 'Queixa principal', fieldType: 'TEXTAREA' as const, required: true, options: null },
  { id: 'f2', label: 'Já fez terapia antes?', fieldType: 'SELECT' as const, required: true, options: ['Sim', 'Não'] },
  { id: 'f3', label: 'Medicação', fieldType: 'TEXT' as const, required: false, options: null },
]

describe('validateFormResponses', () => {
  it('accepts a valid response set', () => {
    const result = validateFormResponses(fields, { f1: 'Ansiedade', f2: 'Sim' })
    expect(result).toEqual({ f1: 'Ansiedade', f2: 'Sim' })
  })

  it('throws when a required field is missing', () => {
    expect(() => validateFormResponses(fields, { f2: 'Sim' })).toThrow(/Queixa principal/)
  })

  it('throws when a SELECT value is not one of the options', () => {
    expect(() => validateFormResponses(fields, { f1: 'x', f2: 'Talvez' })).toThrow(/Já fez terapia antes/)
  })

  it('allows an optional field to be omitted', () => {
    const result = validateFormResponses(fields, { f1: 'x', f2: 'Não' })
    expect(result.f3).toBeUndefined()
  })
})
