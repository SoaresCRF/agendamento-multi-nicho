import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase } from '../../../test/helpers'

describe('POST /api/auth/register', () => {
  beforeEach(cleanDatabase)

  it('creates a professional and returns an access token + refresh cookie', async () => {
    const app = createApp()
    const res = await request(app).post('/api/auth/register').send({
      name: 'Joana Silva',
      email: 'joana@example.com',
      password: 'password123',
      slug: 'joana-psicologa',
      timezone: 'America/Sao_Paulo',
      niche: 'Psicologia',
    })
    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({ email: 'joana@example.com', slug: 'joana-psicologa' })
    expect(typeof res.body.accessToken).toBe('string')
    expect(res.headers['set-cookie']?.[0]).toMatch(/refreshToken=/)
  })

  it('rejects a duplicate email with 409', async () => {
    const app = createApp()
    const payload = {
      name: 'A',
      email: 'dup@example.com',
      password: 'password123',
      slug: 'slug-a',
      timezone: 'America/Sao_Paulo',
    }
    await request(app).post('/api/auth/register').send(payload)
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...payload, slug: 'slug-b' })
    expect(res.status).toBe(409)
  })
})
