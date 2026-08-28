import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { prisma } from '../src/lib/prisma'

describe('no_overlapping_confirmed_bookings constraint', () => {
  let userId: string
  let serviceTypeId: string

  beforeEach(async () => {
    await prisma.booking.deleteMany()
    await prisma.serviceType.deleteMany()
    await prisma.user.deleteMany()
    const user = await prisma.user.create({
      data: {
        name: 'Test', email: `t-${Date.now()}@example.com`, passwordHash: 'x',
        slug: `t-${Date.now()}`, timezone: 'America/Sao_Paulo',
      },
    })
    userId = user.id
    const serviceType = await prisma.serviceType.create({
      data: { userId, name: 'Sessão', durationMinutes: 50 },
    })
    serviceTypeId = serviceType.id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('rejects a second CONFIRMED booking that overlaps an existing one', async () => {
    await prisma.booking.create({
      data: {
        userId, serviceTypeId, clientName: 'A', clientEmail: 'a@example.com',
        startsAt: new Date('2026-09-01T13:00:00Z'), endsAt: new Date('2026-09-01T13:50:00Z'),
      },
    })
    await expect(
      prisma.booking.create({
        data: {
          userId, serviceTypeId, clientName: 'B', clientEmail: 'b@example.com',
          startsAt: new Date('2026-09-01T13:25:00Z'), endsAt: new Date('2026-09-01T14:15:00Z'),
        },
      })
    ).rejects.toThrow()
  })

  it('allows a CANCELLED booking to overlap a CONFIRMED one', async () => {
    const startsAt = new Date('2026-09-02T13:00:00Z')
    const endsAt = new Date('2026-09-02T13:50:00Z')
    await prisma.booking.create({
      data: {
        userId, serviceTypeId, clientName: 'A', clientEmail: 'a@example.com',
        startsAt, endsAt, status: 'CANCELLED',
      },
    })
    await expect(
      prisma.booking.create({
        data: { userId, serviceTypeId, clientName: 'B', clientEmail: 'b@example.com', startsAt, endsAt },
      })
    ).resolves.toBeDefined()
  })
})
