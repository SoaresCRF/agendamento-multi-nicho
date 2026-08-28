import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase, createTestUser } from '../../../test/helpers'

describe('blocked-slot CRUD', () => {
  beforeEach(cleanDatabase)

  it('creates, lists and deletes a blocked slot, scoped to its owner', async () => {
    const { accessToken } = await createTestUser()
    const app = createApp()
    const auth = { Authorization: `Bearer ${accessToken}` }

    const createRes = await request(app).post('/api/blocked-slots').set(auth).send({
      startsAt: '2026-12-25T00:00:00.000Z', endsAt: '2026-12-26T00:00:00.000Z', reason: 'Feriado',
    })
    expect(createRes.status).toBe(201)

    const listRes = await request(app).get('/api/blocked-slots').set(auth)
    expect(listRes.body).toHaveLength(1)

    const other = await createTestUser({ email: 'other@example.com', slug: 'other' })
    const forbiddenRes = await request(app).delete(`/api/blocked-slots/${createRes.body.id}`)
      .set('Authorization', `Bearer ${other.accessToken}`)
    expect(forbiddenRes.status).toBe(404)

    const deleteRes = await request(app).delete(`/api/blocked-slots/${createRes.body.id}`).set(auth)
    expect(deleteRes.status).toBe(204)
  })
})
