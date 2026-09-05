import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase, createTestUser } from '../../../test/helpers'
import { prisma } from '../../lib/prisma'

describe('professional agenda', () => {
  beforeEach(cleanDatabase)

  it("lists only the professional's own bookings and can cancel one", async () => {
    const { user, accessToken } = await createTestUser({ email: 'agenda@example.com', slug: 'agenda-slug' })
    const serviceType = await prisma.serviceType.create({
      data: { userId: user.id, name: 'Sessão', durationMinutes: 50 },
    })
    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        serviceTypeId: serviceType.id,
        clientName: 'Cliente',
        clientEmail: 'c@example.com',
        startsAt: new Date('2026-09-10T13:00:00Z'),
        endsAt: new Date('2026-09-10T13:50:00Z'),
      },
    })
    const app = createApp()
    const auth = { Authorization: `Bearer ${accessToken}` }

    const listRes = await request(app).get('/api/bookings').set(auth)
    expect(listRes.body.items).toHaveLength(1)
    expect(listRes.body.nextCursor).toBeNull()

    const cancelRes = await request(app).patch(`/api/bookings/${booking.id}/cancel`).set(auth)
    expect(cancelRes.status).toBe(200)
    expect(cancelRes.body.status).toBe('CANCELLED')

    const other = await createTestUser({ email: 'other-agenda@example.com', slug: 'other-agenda' })
    const forbiddenRes = await request(app)
      .patch(`/api/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${other.accessToken}`)
    expect(forbiddenRes.status).toBe(404)
  })

  it('paginates results with limit and cursor instead of returning everything at once', async () => {
    const { user, accessToken } = await createTestUser({ email: 'paged@example.com', slug: 'paged-slug' })
    const serviceType = await prisma.serviceType.create({
      data: { userId: user.id, name: 'Sessão', durationMinutes: 50 },
    })
    for (let i = 0; i < 3; i++) {
      await prisma.booking.create({
        data: {
          userId: user.id,
          serviceTypeId: serviceType.id,
          clientName: `Cliente ${i}`,
          clientEmail: `c${i}@example.com`,
          startsAt: new Date(Date.UTC(2026, 8, 10 + i, 13, 0)),
          endsAt: new Date(Date.UTC(2026, 8, 10 + i, 13, 50)),
        },
      })
    }
    const app = createApp()
    const auth = { Authorization: `Bearer ${accessToken}` }

    const firstPage = await request(app).get('/api/bookings?limit=2').set(auth)
    expect(firstPage.body.items).toHaveLength(2)
    expect(firstPage.body.items.map((b: { clientName: string }) => b.clientName)).toEqual(['Cliente 0', 'Cliente 1'])
    expect(firstPage.body.nextCursor).not.toBeNull()

    const secondPage = await request(app).get(`/api/bookings?limit=2&cursor=${firstPage.body.nextCursor}`).set(auth)
    expect(secondPage.body.items).toHaveLength(1)
    expect(secondPage.body.items[0].clientName).toBe('Cliente 2')
    expect(secondPage.body.nextCursor).toBeNull()
  })

  it("rejects a cursor that belongs to another professional's booking", async () => {
    const { user, accessToken } = await createTestUser({ email: 'owner@example.com', slug: 'owner-slug' })
    const serviceType = await prisma.serviceType.create({
      data: { userId: user.id, name: 'Sessão', durationMinutes: 50 },
    })
    await prisma.booking.create({
      data: {
        userId: user.id,
        serviceTypeId: serviceType.id,
        clientName: 'Cliente do dono',
        clientEmail: 'owner-client@example.com',
        startsAt: new Date('2026-09-10T13:00:00Z'),
        endsAt: new Date('2026-09-10T13:50:00Z'),
      },
    })

    const other = await createTestUser({ email: 'stranger@example.com', slug: 'stranger-slug' })
    const otherServiceType = await prisma.serviceType.create({
      data: { userId: other.user.id, name: 'Sessão', durationMinutes: 50 },
    })
    const otherBooking = await prisma.booking.create({
      data: {
        userId: other.user.id,
        serviceTypeId: otherServiceType.id,
        clientName: 'Cliente do outro',
        clientEmail: 'other-client@example.com',
        startsAt: new Date('2026-09-11T13:00:00Z'),
        endsAt: new Date('2026-09-11T13:50:00Z'),
      },
    })

    const app = createApp()
    const res = await request(app)
      .get(`/api/bookings?cursor=${otherBooking.id}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(400)
  })
})
