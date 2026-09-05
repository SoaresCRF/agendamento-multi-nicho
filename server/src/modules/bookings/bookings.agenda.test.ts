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
    expect(listRes.body).toHaveLength(1)

    const cancelRes = await request(app).patch(`/api/bookings/${booking.id}/cancel`).set(auth)
    expect(cancelRes.status).toBe(200)
    expect(cancelRes.body.status).toBe('CANCELLED')

    const other = await createTestUser({ email: 'other-agenda@example.com', slug: 'other-agenda' })
    const forbiddenRes = await request(app)
      .patch(`/api/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${other.accessToken}`)
    expect(forbiddenRes.status).toBe(404)
  })
})
