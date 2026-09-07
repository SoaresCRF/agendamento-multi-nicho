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

  it('includes profilePhotoUrl and bio', async () => {
    const { accessToken } = await createTestUser({ email: 'photo@example.com', slug: 'photo-slug' })
    const res = await request(createApp()).get('/api/me').set('Authorization', `Bearer ${accessToken}`)
    expect(res.body).toMatchObject({ profilePhotoUrl: null, bio: null })
  })
})

describe('PATCH /api/me', () => {
  beforeEach(cleanDatabase)

  it('updates profilePhotoUrl and bio', async () => {
    const { accessToken } = await createTestUser({ email: 'update@example.com', slug: 'update-slug' })
    const res = await request(createApp())
      .patch('/api/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ profilePhotoUrl: 'https://example.com/photo.jpg', bio: 'Psicóloga clínica há 10 anos.' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      profilePhotoUrl: 'https://example.com/photo.jpg',
      bio: 'Psicóloga clínica há 10 anos.',
    })
  })

  it('allows clearing profilePhotoUrl and bio with null', async () => {
    const { accessToken } = await createTestUser({ email: 'clear@example.com', slug: 'clear-slug' })
    await request(createApp())
      .patch('/api/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ profilePhotoUrl: 'https://example.com/photo.jpg', bio: 'Bio' })

    const res = await request(createApp())
      .patch('/api/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ profilePhotoUrl: null, bio: null })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ profilePhotoUrl: null, bio: null })
  })

  it('rejects a non-https profilePhotoUrl', async () => {
    const { accessToken } = await createTestUser({ email: 'insecure@example.com', slug: 'insecure-slug' })
    const res = await request(createApp())
      .patch('/api/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ profilePhotoUrl: 'http://example.com/photo.jpg' })

    expect(res.status).toBe(400)
  })

  it('rejects a bio longer than 280 characters', async () => {
    const { accessToken } = await createTestUser({ email: 'longbio@example.com', slug: 'longbio-slug' })
    const res = await request(createApp())
      .patch('/api/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ bio: 'a'.repeat(281) })

    expect(res.status).toBe(400)
  })

  it('rejects an unauthenticated request', async () => {
    const res = await request(createApp()).patch('/api/me').send({ bio: 'Bio' })
    expect(res.status).toBe(401)
  })
})
