import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase } from '../../../test/helpers'

function extractCookie(res: request.Response) {
  const raw = res.headers['set-cookie']?.[0] as string
  return raw.split(';')[0]
}

describe('POST /api/auth/refresh and /logout', () => {
  beforeEach(cleanDatabase)

  it('issues a new access token and rotates the refresh cookie', async () => {
    const app = createApp()
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Joana', email: 'refresh@example.com', password: 'password123',
      slug: 'refresh-slug', timezone: 'America/Sao_Paulo',
    })
    const cookie = extractCookie(registerRes)

    const refreshRes = await request(app).post('/api/auth/refresh').set('Cookie', cookie)
    expect(refreshRes.status).toBe(200)
    expect(typeof refreshRes.body.accessToken).toBe('string')
    expect(refreshRes.body.accessToken).not.toBe(registerRes.body.accessToken)

    const newCookie = extractCookie(refreshRes)
    expect(newCookie).not.toBe(cookie)

    // old refresh token is now revoked
    const reuseRes = await request(app).post('/api/auth/refresh').set('Cookie', cookie)
    expect(reuseRes.status).toBe(401)
  })

  it('revokes the refresh token on logout', async () => {
    const app = createApp()
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Joana', email: 'logout@example.com', password: 'password123',
      slug: 'logout-slug', timezone: 'America/Sao_Paulo',
    })
    const cookie = extractCookie(registerRes)

    const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', cookie)
    expect(logoutRes.status).toBe(204)

    const refreshRes = await request(app).post('/api/auth/refresh').set('Cookie', cookie)
    expect(refreshRes.status).toBe(401)
  })
})
