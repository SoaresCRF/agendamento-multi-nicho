import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase, createTestUser } from '../../../test/helpers'

describe('service-type CRUD', () => {
  beforeEach(cleanDatabase)

  const payload = {
    name: 'Primeira consulta',
    durationMinutes: 60,
    requiresCustomForm: true,
    customFields: [{ label: 'Queixa principal', fieldType: 'TEXTAREA', required: true, order: 0 }],
  }

  it('creates, lists, gets, updates and deletes a service type', async () => {
    const { accessToken } = await createTestUser()
    const app = createApp()
    const auth = { Authorization: `Bearer ${accessToken}` }

    const createRes = await request(app).post('/api/service-types').set(auth).send(payload)
    expect(createRes.status).toBe(201)
    expect(createRes.body.customFields).toHaveLength(1)
    const id = createRes.body.id

    const listRes = await request(app).get('/api/service-types').set(auth)
    expect(listRes.body).toHaveLength(1)

    const getRes = await request(app).get(`/api/service-types/${id}`).set(auth)
    expect(getRes.status).toBe(200)

    const updateRes = await request(app)
      .patch(`/api/service-types/${id}`)
      .set(auth)
      .send({ ...payload, name: 'Renamed' })
    expect(updateRes.body.name).toBe('Renamed')

    const deleteRes = await request(app).delete(`/api/service-types/${id}`).set(auth)
    expect(deleteRes.status).toBe(204)
  })

  it("never exposes another professional's service types (no IDOR)", async () => {
    const owner = await createTestUser({ email: 'owner@example.com', slug: 'owner' })
    const other = await createTestUser({ email: 'other@example.com', slug: 'other' })
    const app = createApp()

    const createRes = await request(app)
      .post('/api/service-types')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send(payload)

    const getRes = await request(app)
      .get(`/api/service-types/${createRes.body.id}`)
      .set('Authorization', `Bearer ${other.accessToken}`)
    expect(getRes.status).toBe(404)
  })

  it('never lets another professional delete a service type they do not own (no IDOR)', async () => {
    const owner = await createTestUser({ email: 'owner2@example.com', slug: 'owner2' })
    const other = await createTestUser({ email: 'other2@example.com', slug: 'other2' })
    const app = createApp()

    const createRes = await request(app)
      .post('/api/service-types')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send(payload)

    const deleteRes = await request(app)
      .delete(`/api/service-types/${createRes.body.id}`)
      .set('Authorization', `Bearer ${other.accessToken}`)
    expect(deleteRes.status).toBe(404)

    const getRes = await request(app)
      .get(`/api/service-types/${createRes.body.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
    expect(getRes.status).toBe(200)
  })
})
