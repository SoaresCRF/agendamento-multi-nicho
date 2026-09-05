import { describe, it, expect, beforeEach } from 'vitest'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { prisma } from '../src/lib/prisma'
import { createPublicBooking } from '../src/modules/bookings/bookings.service'
import { cleanDatabase } from './helpers'
import type { Mailer } from '../src/lib/email'

const fakeMailer: Mailer = { sendMail: async () => {} }
const TIMEZONE = 'America/Sao_Paulo'

describe('booking concurrency', () => {
  beforeEach(cleanDatabase)

  it('allows only one of two simultaneous bookings for the same slot to succeed', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Joana',
        email: 'joana-conc@example.com',
        passwordHash: 'x',
        slug: 'joana-conc',
        timezone: TIMEZONE,
      },
    })
    const serviceType = await prisma.serviceType.create({
      data: { userId: user.id, name: 'Sessão', durationMinutes: 50 },
    })
    // Tomorrow at a fixed 10:00 local time — not "now + 24h" — so the test doesn't
    // depend on what time of day it happens to run (a slot starting late at night
    // could push its end past midnight, outside any single day's availability window).
    const localDate = formatInTimeZone(new Date(Date.now() + 24 * 60 * 60 * 1000), TIMEZONE, 'yyyy-MM-dd')
    const startsAtDate = fromZonedTime(`${localDate}T10:00:00`, TIMEZONE)
    const startsAt = startsAtDate.toISOString()
    // dayOfWeek computed the same way engine.ts's dayOfWeekFor does (local-noon UTC
    // day) to avoid an independent, possibly-drifting reimplementation of that logic.
    await prisma.availability.create({
      data: {
        userId: user.id,
        dayOfWeek: fromZonedTime(`${localDate}T12:00:00`, TIMEZONE).getUTCDay(),
        startTime: '10:00',
        endTime: '18:00',
      },
    })

    const attempt = () =>
      createPublicBooking(
        'joana-conc',
        {
          serviceTypeId: serviceType.id,
          startsAt,
          clientName: 'Cliente',
          clientEmail: 'cliente@example.com',
        },
        fakeMailer,
      )

    const results = await Promise.allSettled([attempt(), attempt()])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)

    const confirmedCount = await prisma.booking.count({ where: { userId: user.id, status: 'CONFIRMED' } })
    expect(confirmedCount).toBe(1)
  })
})
