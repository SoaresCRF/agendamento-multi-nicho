import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../src/lib/prisma'
import { createPublicBooking } from '../src/modules/bookings/bookings.service'
import { cleanDatabase } from './helpers'
import type { Mailer } from '../src/lib/email'

const fakeMailer: Mailer = { sendMail: async () => {} }

describe('booking concurrency', () => {
  beforeEach(cleanDatabase)

  it('allows only one of two simultaneous bookings for the same slot to succeed', async () => {
    const user = await prisma.user.create({
      data: { name: 'Joana', email: 'joana-conc@example.com', passwordHash: 'x', slug: 'joana-conc', timezone: 'America/Sao_Paulo' },
    })
    const serviceType = await prisma.serviceType.create({ data: { userId: user.id, name: 'Sessão', durationMinutes: 50 } })
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const attempt = () => createPublicBooking('joana-conc', {
      serviceTypeId: serviceType.id, startsAt, clientName: 'Cliente', clientEmail: 'cliente@example.com',
    }, fakeMailer)

    const results = await Promise.allSettled([attempt(), attempt()])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)

    const confirmedCount = await prisma.booking.count({ where: { userId: user.id, status: 'CONFIRMED' } })
    expect(confirmedCount).toBe(1)
  })
})
