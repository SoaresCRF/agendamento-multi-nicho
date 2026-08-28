import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../lib/prisma'
import { createPublicBooking } from './bookings.service'
import { cleanDatabase, createTestUser } from '../../../test/helpers'
import type { Mailer, SendMailInput } from '../../lib/email'

function fakeMailer(): { mailer: Mailer; sent: SendMailInput[] } {
  const sent: SendMailInput[] = []
  return { mailer: { sendMail: async (input) => { sent.push(input) } }, sent }
}

describe('createPublicBooking', () => {
  beforeEach(cleanDatabase)

  it('creates a booking, validates the custom form, and emails both parties', async () => {
    const { user } = await createTestUser({ email: 'prof@example.com', slug: 'prof' })
    const serviceType = await prisma.serviceType.create({
      data: {
        userId: user.id, name: 'Primeira consulta', durationMinutes: 60, requiresCustomForm: true,
        customFields: { create: [{ label: 'Queixa principal', fieldType: 'TEXTAREA', required: true, order: 0 }] },
      },
      include: { customFields: true },
    })
    const { mailer, sent } = fakeMailer()

    const booking = await createPublicBooking('prof', {
      serviceTypeId: serviceType.id,
      startsAt: '2026-09-10T13:00:00.000Z',
      clientName: 'Cliente Teste',
      clientEmail: 'cliente@example.com',
      formResponses: { [serviceType.customFields[0].id]: 'Ansiedade' },
    }, mailer)

    expect(booking.status).toBe('CONFIRMED')
    expect(sent).toHaveLength(2)
    expect(sent.map((s) => s.to).sort()).toEqual(['cliente@example.com', 'prof@example.com'].sort())
  })

  it('rejects a booking missing a required custom field', async () => {
    const { user } = await createTestUser({ email: 'prof2@example.com', slug: 'prof2' })
    const serviceType = await prisma.serviceType.create({
      data: {
        userId: user.id, name: 'Consulta', durationMinutes: 60, requiresCustomForm: true,
        customFields: { create: [{ label: 'Objetivo', fieldType: 'TEXT', required: true, order: 0 }] },
      },
    })
    const { mailer } = fakeMailer()

    await expect(createPublicBooking('prof2', {
      serviceTypeId: serviceType.id, startsAt: '2026-09-10T13:00:00.000Z',
      clientName: 'C', clientEmail: 'c@example.com',
    }, mailer)).rejects.toThrow(/Objetivo/)
  })

  it('returns 409-mapped error when the slot is already booked', async () => {
    const { user } = await createTestUser({ email: 'prof3@example.com', slug: 'prof3' })
    const serviceType = await prisma.serviceType.create({
      data: { userId: user.id, name: 'Sessão', durationMinutes: 50 },
    })
    const { mailer } = fakeMailer()
    const startsAt = '2026-09-10T13:00:00.000Z'

    await createPublicBooking('prof3', { serviceTypeId: serviceType.id, startsAt, clientName: 'A', clientEmail: 'a@example.com' }, mailer)
    await expect(
      createPublicBooking('prof3', { serviceTypeId: serviceType.id, startsAt, clientName: 'B', clientEmail: 'b@example.com' }, mailer)
    ).rejects.toMatchObject({ statusCode: 409 })
  })
})
