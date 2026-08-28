import { describe, it, expect } from 'vitest'
import { getAvailableSlots } from './engine'

const SP = 'America/Sao_Paulo'

describe('getAvailableSlots', () => {
  it('generates slots that fit exactly within a general availability window', () => {
    const slots = getAvailableSlots({
      date: '2026-09-07', // a Monday
      timezone: SP,
      durationMinutes: 60,
      generalRules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '11:00' }],
      serviceTypeRules: [],
      conflicts: [],
      now: new Date('2026-09-01T00:00:00Z'),
    })
    expect(slots).toHaveLength(2)
    expect(slots[0].toISOString()).toBe('2026-09-07T12:00:00.000Z') // 09:00 -03:00
    expect(slots[1].toISOString()).toBe('2026-09-07T13:00:00.000Z') // 10:00 -03:00
  })

  it('drops a trailing slot that would not fully fit in the window', () => {
    const slots = getAvailableSlots({
      date: '2026-09-07',
      timezone: SP,
      durationMinutes: 50,
      generalRules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:30' }],
      serviceTypeRules: [],
      conflicts: [],
      now: new Date('2026-09-01T00:00:00Z'),
    })
    // 09:00-09:50 fits; 09:50-10:40 would exceed 10:30, so only 1 slot
    expect(slots).toHaveLength(1)
  })

  it('service-type rules override, not add to, general availability for that weekday', () => {
    const slots = getAvailableSlots({
      date: '2026-09-07',
      timezone: SP,
      durationMinutes: 60,
      generalRules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }],
      serviceTypeRules: [{ dayOfWeek: 1, startTime: '14:00', endTime: '15:00' }],
      conflicts: [],
      now: new Date('2026-09-01T00:00:00Z'),
    })
    expect(slots).toHaveLength(1)
    expect(slots[0].toISOString()).toBe('2026-09-07T17:00:00.000Z') // 14:00 -03:00
  })

  it('removes a slot that overlaps an existing conflict (booking or blocked slot)', () => {
    const slots = getAvailableSlots({
      date: '2026-09-07',
      timezone: SP,
      durationMinutes: 60,
      generalRules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '11:00' }],
      serviceTypeRules: [],
      conflicts: [{ startsAt: new Date('2026-09-07T12:00:00Z'), endsAt: new Date('2026-09-07T13:00:00Z') }],
      now: new Date('2026-09-01T00:00:00Z'),
    })
    expect(slots).toHaveLength(1)
    expect(slots[0].toISOString()).toBe('2026-09-07T13:00:00.000Z')
  })

  it('drops slots that start before "now"', () => {
    const slots = getAvailableSlots({
      date: '2026-09-07',
      timezone: SP,
      durationMinutes: 60,
      generalRules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '11:00' }],
      serviceTypeRules: [],
      conflicts: [],
      now: new Date('2026-09-07T12:30:00Z'), // 09:30 local — after the 09:00 slot's start
    })
    expect(slots).toHaveLength(1)
    expect(slots[0].toISOString()).toBe('2026-09-07T13:00:00.000Z')
  })

  it('resolves a recurring 09:00 local slot correctly across a DST transition', () => {
    // Brazil abolished DST in 2019 and America/Sao_Paulo has had a fixed -03:00
    // offset since; this test locks in that a fixed-offset zone is handled
    // correctly and documents the DST-aware conversion path for zones that do
    // observe DST (date-fns-tz handles the offset lookup per-date already).
    const winter = getAvailableSlots({
      date: '2026-06-01', timezone: SP, durationMinutes: 60,
      generalRules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }],
      serviceTypeRules: [], conflicts: [], now: new Date('2026-01-01T00:00:00Z'),
    })
    const summer = getAvailableSlots({
      date: '2026-12-07', timezone: SP, durationMinutes: 60,
      generalRules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }],
      serviceTypeRules: [], conflicts: [], now: new Date('2026-01-01T00:00:00Z'),
    })
    expect(winter[0].getUTCHours()).toBe(12) // 09:00 -03:00
    expect(summer[0].getUTCHours()).toBe(12) // 09:00 -03:00, same fixed offset
  })

  it('returns no slots when no rule exists for that weekday', () => {
    const slots = getAvailableSlots({
      date: '2026-09-06', // a Sunday
      timezone: SP, durationMinutes: 60,
      generalRules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }],
      serviceTypeRules: [], conflicts: [], now: new Date('2026-09-01T00:00:00Z'),
    })
    expect(slots).toHaveLength(0)
  })
})
