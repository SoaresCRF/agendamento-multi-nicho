import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase } from '../../../test/helpers'

describe('POST /api/auth/login', () => {
  beforeEach(cleanDatabase)

  it('logs in with correct credentials', async () => {
    const app = createApp()
    await request(app).post('/api/auth/register').send({
      name: 'Joana',
      email: 'joana@example.com',
      password: 'password123',
      slug: 'joana',
      timezone: 'America/Sao_Paulo',
    })
    const res = await request(app).post('/api/auth/login').send({ email: 'joana@example.com', password: 'password123' })
    expect(res.status).toBe(200)
    expect(typeof res.body.accessToken).toBe('string')
  })

  it('rejects wrong password with 401', async () => {
    const app = createApp()
    await request(app).post('/api/auth/register').send({
      name: 'Joana',
      email: 'joana2@example.com',
      password: 'password123',
      slug: 'joana2',
      timezone: 'America/Sao_Paulo',
    })
    const res = await request(app).post('/api/auth/login').send({ email: 'joana2@example.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })
})
