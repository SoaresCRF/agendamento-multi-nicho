import { describe, it, expect } from 'vitest'
import { buildBookingIcs } from './calendarEvent'

describe('buildBookingIcs', () => {
  it('builds a valid ICS event with the booking details, in UTC, spanning the service duration', () => {
    const ics = buildBookingIcs({
      bookingId: 'booking-abc123',
      serviceName: 'Primeira consulta',
      professionalName: 'Joana Silva',
      startsAt: '2026-09-20T13:00:00.000Z',
      durationMinutes: 60,
    })

    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/)
    expect(ics).toContain('BEGIN:VEVENT\r\n')
    expect(ics).toContain('SUMMARY:Primeira consulta com Joana Silva\r\n')
    expect(ics).toContain('DTSTART:20260920T130000Z\r\n')
    expect(ics).toContain('DTEND:20260920T140000Z\r\n')
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z\r\n/)
    expect(ics).toContain('END:VEVENT\r\n')
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true)
  })

  it('derives the UID from the booking id, not the start time', () => {
    const icsA = buildBookingIcs({
      bookingId: 'booking-a',
      serviceName: 'Consulta',
      professionalName: 'Joana Silva',
      startsAt: '2026-09-20T13:00:00.000Z',
      durationMinutes: 60,
    })
    const icsB = buildBookingIcs({
      bookingId: 'booking-b',
      serviceName: 'Consulta',
      professionalName: 'Outro Profissional',
      startsAt: '2026-09-20T13:00:00.000Z',
      durationMinutes: 60,
    })

    expect(icsA).toContain('UID:booking-a@agendamento')
    expect(icsB).toContain('UID:booking-b@agendamento')
  })
})
