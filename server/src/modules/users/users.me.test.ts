import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase, createTestUser } from '../../../test/helpers'

describe('GET /api/me', () => {
  beforeEach(cleanDatabase)

  it('returns the authenticated professional', async () => {
    const { user, accessToken } = await createTestUser({ email: 'me@example.com', slug: 'me-slug' })
    const res = await request(createApp()).get('/api/me').set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: user.id, email: 'me@example.com', slug: 'me-slug' })
  })

  it('rejects an unauthenticated request', async () => {
    const res = await request(createApp()).get('/api/me')
    expect(res.status).toBe(401)
  })
})
