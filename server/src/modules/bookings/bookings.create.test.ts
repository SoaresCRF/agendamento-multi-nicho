import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../lib/prisma'
import { createPublicBooking } from './bookings.service'
import { cleanDatabase, createTestUser } from '../../../test/helpers'
import { decryptJson } from '../../lib/fieldEncryption'
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

  it('stores formResponses encrypted at rest, not as plaintext JSON', async () => {
    const { user } = await createTestUser({ email: 'crypto-prof@example.com', slug: 'crypto-prof' })
    await prisma.availability.create({
      data: { userId: user.id, dayOfWeek: THURSDAY, startTime: '10:00', endTime: '18:00' },
    })
    const serviceType = await prisma.serviceType.create({
      data: {
        userId: user.id,
        name: 'Primeira consulta',
        durationMinutes: 60,
        requiresCustomForm: true,
        customFields: {
          create: [{ label: 'Está em uso de medicação?', fieldType: 'TEXT', required: true, order: 0 }],
        },
      },
      include: { customFields: true },
    })
    const { mailer } = fakeMailer()

    const booking = await createPublicBooking(
      'crypto-prof',
      {
        serviceTypeId: serviceType.id,
        startsAt: '2026-09-10T13:00:00.000Z',
        clientName: 'Cliente Teste',
        clientEmail: 'cliente@example.com',
        formResponses: { [serviceType.customFields[0].id]: 'Sim, sertralina' },
      },
      mailer,
    )

    const stored = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })
    expect(stored.formResponses).not.toContain('sertralina')
    expect(stored.formResponses).not.toContain('medicação')
    expect(decryptJson(stored.formResponses!)).toEqual({ [serviceType.customFields[0].id]: 'Sim, sertralina' })
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

  it('escapes HTML in the client name before putting it in the confirmation emails', async () => {
    const { user } = await createTestUser({ email: 'prof7@example.com', slug: 'prof7' })
    await prisma.availability.create({
      data: { userId: user.id, dayOfWeek: THURSDAY, startTime: '10:00', endTime: '18:00' },
    })
    const serviceType = await prisma.serviceType.create({
      data: { userId: user.id, name: 'Sessão', durationMinutes: 50 },
    })
    const { mailer, sent } = fakeMailer()

    await createPublicBooking(
      'prof7',
      {
        serviceTypeId: serviceType.id,
        startsAt: '2026-09-10T13:00:00.000Z',
        clientName: '<img src=x onerror=alert(1)>',
        clientEmail: 'a@example.com',
      },
      mailer,
    )

    const professionalEmail = sent.find((s) => s.to === 'prof7@example.com')
    expect(professionalEmail?.html).not.toContain('<img src=x onerror=alert(1)>')
    expect(professionalEmail?.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('does not wait for email delivery before resolving', async () => {
    const { user } = await createTestUser({ email: 'prof6@example.com', slug: 'prof6' })
    await prisma.availability.create({
      data: { userId: user.id, dayOfWeek: THURSDAY, startTime: '10:00', endTime: '18:00' },
    })
    const serviceType = await prisma.serviceType.create({
      data: { userId: user.id, name: 'Sessão', durationMinutes: 50 },
    })
    const hangingMailer: Mailer = { sendMail: () => new Promise(() => {}) } // never resolves

    const result = await Promise.race([
      createPublicBooking(
        'prof6',
        {
          serviceTypeId: serviceType.id,
          startsAt: '2026-09-10T13:00:00.000Z',
          clientName: 'A',
          clientEmail: 'a@example.com',
        },
        hangingMailer,
      ),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timed out waiting on email')), 1000)),
    ])

    expect((result as { status: string }).status).toBe('CONFIRMED')
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
