import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase, createTestUser } from '../../../test/helpers'

describe('GET/PUT /api/availability', () => {
  beforeEach(cleanDatabase)

  it('replaces the weekly availability and returns it', async () => {
    const { accessToken } = await createTestUser()
    const app = createApp()
    const auth = { Authorization: `Bearer ${accessToken}` }
    const rules = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '18:00' },
    ]

    const putRes = await request(app).put('/api/availability').set(auth).send(rules)
    expect(putRes.status).toBe(200)
    expect(putRes.body).toHaveLength(2)

    const replaceRes = await request(app).put('/api/availability').set(auth)
      .send([{ dayOfWeek: 3, startTime: '10:00', endTime: '16:00' }])
    expect(replaceRes.body).toHaveLength(1)

    const getRes = await request(app).get('/api/availability').set(auth)
    expect(getRes.body).toHaveLength(1)
    expect(getRes.body[0]).toMatchObject({ dayOfWeek: 3, startTime: '10:00', endTime: '16:00' })
  })
})
