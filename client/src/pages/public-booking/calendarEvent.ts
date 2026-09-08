import { addMinutes } from 'date-fns'

interface BookingIcsInput {
  bookingId: string
  serviceName: string
  professionalName: string
  startsAt: string
  durationMinutes: number
}

function toIcsUtc(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
}

// RFC 5545 requires CRLF line endings — some calendar apps reject a file that uses
// bare \n, so this can't just be a template literal with normal newlines.
export function buildBookingIcs({
  bookingId,
  serviceName,
  professionalName,
  startsAt,
  durationMinutes,
}: BookingIcsInput): string {
  const start = new Date(startsAt)
  const end = addMinutes(start, durationMinutes)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agendamento Multi-Nicho//PT-BR',
    'BEGIN:VEVENT',
    `UID:${bookingId}@agendamento`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${serviceName} com ${professionalName}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
