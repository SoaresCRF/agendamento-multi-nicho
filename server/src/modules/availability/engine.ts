import { addMinutes, isBefore } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'

export interface AvailabilityRuleRow {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface ConflictRange {
  startsAt: Date
  endsAt: Date
}

export interface GetAvailableSlotsInput {
  date: string
  timezone: string
  durationMinutes: number
  generalRules: AvailabilityRuleRow[]
  serviceTypeRules: AvailabilityRuleRow[]
  conflicts: ConflictRange[]
  now?: Date
}

function dayOfWeekFor(date: string, timezone: string): number {
  // Resolved at local noon to avoid a UTC-midnight conversion ever landing
  // on the wrong calendar date near a timezone's day boundary.
  const localNoon = fromZonedTime(`${date}T12:00:00`, timezone)
  return localNoon.getUTCDay()
}

function windowsForDay(input: GetAvailableSlotsInput, dayOfWeek: number): AvailabilityRuleRow[] {
  const serviceRules = input.serviceTypeRules.filter((r) => r.dayOfWeek === dayOfWeek)
  if (serviceRules.length > 0) return serviceRules
  return input.generalRules.filter((r) => r.dayOfWeek === dayOfWeek)
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd
}

export function getAvailableSlots(input: GetAvailableSlotsInput): Date[] {
  const dayOfWeek = dayOfWeekFor(input.date, input.timezone)
  const windows = windowsForDay(input, dayOfWeek)
  const now = input.now ?? new Date()
  const slots: Date[] = []

  for (const window of windows) {
    const windowStart = fromZonedTime(`${input.date}T${window.startTime}:00`, input.timezone)
    const windowEnd = fromZonedTime(`${input.date}T${window.endTime}:00`, input.timezone)

    let cursor = windowStart
    while (true) {
      const slotEnd = addMinutes(cursor, input.durationMinutes)
      if (slotEnd > windowEnd) break
      const hasConflict = input.conflicts.some((c) => rangesOverlap(cursor, slotEnd, c.startsAt, c.endsAt))
      if (!hasConflict && !isBefore(cursor, now)) {
        slots.push(cursor)
      }
      cursor = addMinutes(cursor, input.durationMinutes)
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime())
}
