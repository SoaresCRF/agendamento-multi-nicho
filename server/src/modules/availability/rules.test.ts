import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase, createTestUser } from '../../../test/helpers'
import { prisma } from '../../lib/prisma'

describe('GET/PUT /api/service-types/:id/availability-rules', () => {
  beforeEach(cleanDatabase)

  it("replaces rules scoped to one service type and rejects access to another owner's", async () => {
    const owner = await createTestUser({ email: 'owner@example.com', slug: 'owner' })
    const serviceType = await prisma.serviceType.create({
      data: { userId: owner.user.id, name: 'Sessão', durationMinutes: 50 },
    })
    const app = createApp()
    const ownerAuth = { Authorization: `Bearer ${owner.accessToken}` }
    const rules = [{ dayOfWeek: 1, startTime: '08:00', endTime: '12:00' }]

    const putRes = await request(app)
      .put(`/api/service-types/${serviceType.id}/availability-rules`)
      .set(ownerAuth)
      .send(rules)
    expect(putRes.status).toBe(200)
    expect(putRes.body).toHaveLength(1)

    const other = await createTestUser({ email: 'other@example.com', slug: 'other' })
    const forbiddenRes = await request(app)
      .get(`/api/service-types/${serviceType.id}/availability-rules`)
      .set('Authorization', `Bearer ${other.accessToken}`)
    expect(forbiddenRes.status).toBe(404)
  })
})
