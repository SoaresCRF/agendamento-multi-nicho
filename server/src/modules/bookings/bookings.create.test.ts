import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../lib/prisma'
import { createPublicBooking } from './bookings.service'
import { cleanDatabase, createTestUser } from '../../../test/helpers'
import type { Mailer, SendMailInput } from '../../lib/email'

function fakeMailer(): { mailer: Mailer; sent: SendMailInput[] } {
  const sent: SendMailInput[] = []
  return {
    mailer: {
      sendMail: async (input) => {
        sent.push(input)
      },
    },
    sent,
  }
}

// Fixed test instant: 2026-09-10T13:00:00.000Z is a Thursday (dayOfWeek 4) at 10:00
// local time in America/Sao_Paulo (UTC-3, no DST). Availability rules below use that
// window so the new server-side availability check (createPublicBooking now re-derives
// available slots instead of trusting the client) doesn't reject these as out-of-window.
const THURSDAY = 4

describe('createPublicBooking', () => {
  beforeEach(cleanDatabase)

  it('creates a booking, validates the custom form, and emails both parties', async () => {
    const { user } = await createTestUser({ email: 'prof@example.com', slug: 'prof' })
    await prisma.availability.create({
      data: { userId: user.id, dayOfWeek: THURSDAY, startTime: '10:00', endTime: '18:00' },
    })
    const serviceType = await prisma.serviceType.create({
      data: {
        userId: user.id,
        name: 'Primeira consulta',
        durationMinutes: 60,
        requiresCustomForm: true,
        customFields: { create: [{ label: 'Queixa principal', fieldType: 'TEXTAREA', required: true, order: 0 }] },
      },
      include: { customFields: true },
    })
    const { mailer, sent } = fakeMailer()

    const booking = await createPublicBooking(
      'prof',
      {
        serviceTypeId: serviceType.id,
        startsAt: '2026-09-10T13:00:00.000Z',
        clientName: 'Cliente Teste',
        clientEmail: 'cliente@example.com',
        formResponses: { [serviceType.customFields[0].id]: 'Ansiedade' },
      },
      mailer,
    )

    expect(booking.status).toBe('CONFIRMED')
    expect(sent).toHaveLength(2)
    expect(sent.map((s) => s.to).sort()).toEqual(['cliente@example.com', 'prof@example.com'].sort())
  })

  it('rejects a booking missing a required custom field', async () => {
    const { user } = await createTestUser({ email: 'prof2@example.com', slug: 'prof2' })
    await prisma.availability.create({
      data: { userId: user.id, dayOfWeek: THURSDAY, startTime: '10:00', endTime: '18:00' },
    })
    const serviceType = await prisma.serviceType.create({
      data: {
        userId: user.id,
        name: 'Consulta',
        durationMinutes: 60,
        requiresCustomForm: true,
        customFields: { create: [{ label: 'Objetivo', fieldType: 'TEXT', required: true, order: 0 }] },
      },
    })
    const { mailer } = fakeMailer()

    await expect(
      createPublicBooking(
        'prof2',
        {
          serviceTypeId: serviceType.id,
          startsAt: '2026-09-10T13:00:00.000Z',
          clientName: 'C',
          clientEmail: 'c@example.com',
        },
        mailer,
      ),
    ).rejects.toThrow(/Objetivo/)
  })

  it('returns 409-mapped error when the slot is already booked', async () => {
    const { user } = await createTestUser({ email: 'prof3@example.com', slug: 'prof3' })
    await prisma.availability.create({
      data: { userId: user.id, dayOfWeek: THURSDAY, startTime: '10:00', endTime: '18:00' },
    })
    const serviceType = await prisma.serviceType.create({
      data: { userId: user.id, name: 'Sessão', durationMinutes: 50 },
    })
    const { mailer } = fakeMailer()
    const startsAt = '2026-09-10T13:00:00.000Z'

    await createPublicBooking(
      'prof3',
      { serviceTypeId: serviceType.id, startsAt, clientName: 'A', clientEmail: 'a@example.com' },
      mailer,
    )
    await expect(
      createPublicBooking(
        'prof3',
        { serviceTypeId: serviceType.id, startsAt, clientName: 'B', clientEmail: 'b@example.com' },
        mailer,
      ),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it("rejects a booking outside the professional's configured availability window", async () => {
    const { user } = await createTestUser({ email: 'prof4@example.com', slug: 'prof4' })
    // No Availability rule created at all — every slot should be rejected.
    const serviceType = await prisma.serviceType.create({
      data: { userId: user.id, name: 'Sessão', durationMinutes: 50 },
    })
    const { mailer } = fakeMailer()

    await expect(
      createPublicBooking(
        'prof4',
        {
          serviceTypeId: serviceType.id,
          startsAt: '2026-09-10T13:00:00.000Z',
          clientName: 'A',
          clientEmail: 'a@example.com',
        },
        mailer,
      ),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects a booking that falls inside a blocked slot', async () => {
    const { user } = await createTestUser({ email: 'prof5@example.com', slug: 'prof5' })
    await prisma.availability.create({
      data: { userId: user.id, dayOfWeek: THURSDAY, startTime: '10:00', endTime: '18:00' },
    })
    await prisma.blockedSlot.create({
      data: {
        userId: user.id,
        startsAt: new Date('2026-09-10T13:00:00.000Z'),
        endsAt: new Date('2026-09-10T14:00:00.000Z'),
      },
    })
    const serviceType = await prisma.serviceType.create({
      data: { userId: user.id, name: 'Sessão', durationMinutes: 50 },
    })
    const { mailer } = fakeMailer()

    await expect(
      createPublicBooking(
        'prof5',
        {
          serviceTypeId: serviceType.id,
          startsAt: '2026-09-10T13:00:00.000Z',
          clientName: 'A',
          clientEmail: 'a@example.com',
        },
        mailer,
      ),
    ).rejects.toMatchObject({ statusCode: 409 })
  })
})
