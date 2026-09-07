import { describe, it, expect } from 'vitest'
import { isNationalHoliday } from './holidays'

describe('isNationalHoliday', () => {
  it.each([
    ['2026-01-01', 'Confraternização Universal'],
    ['2026-04-21', 'Tiradentes'],
    ['2026-05-01', 'Dia do Trabalho'],
    ['2026-09-07', 'Independência do Brasil'],
    ['2026-10-12', 'Nossa Senhora Aparecida'],
    ['2026-11-02', 'Finados'],
    ['2026-11-15', 'Proclamação da República'],
    ['2026-11-20', 'Consciência Negra'],
    ['2026-12-25', 'Natal'],
  ])('recognizes the fixed-date holiday %s (%s)', (date) => {
    expect(isNationalHoliday(date)).toBe(true)
  })

  it.each([
    ['2026-02-17', 'Carnaval'],
    ['2026-04-03', 'Sexta-feira Santa'],
    ['2026-06-04', 'Corpus Christi'],
  ])('recognizes the movable holiday %s (%s), derived from Easter', (date) => {
    expect(isNationalHoliday(date)).toBe(true)
  })

  it('recognizes movable holidays correctly in a different year', () => {
    expect(isNationalHoliday('2027-02-09')).toBe(true) // Carnaval 2027
    expect(isNationalHoliday('2027-03-26')).toBe(true) // Sexta-feira Santa 2027
    expect(isNationalHoliday('2027-05-27')).toBe(true) // Corpus Christi 2027
  })

  it('returns false for an ordinary day', () => {
    expect(isNationalHoliday('2026-09-14')).toBe(false)
  })

  it('returns false for a day adjacent to a fixed holiday', () => {
    expect(isNationalHoliday('2026-09-06')).toBe(false)
    expect(isNationalHoliday('2026-09-08')).toBe(false)
  })
})
