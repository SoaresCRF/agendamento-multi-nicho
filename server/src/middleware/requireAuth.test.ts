import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { requireAuth } from './requireAuth'
import { signAccessToken } from '../lib/jwt'

function buildTestApp() {
  const app = express()
  app.get('/protected', requireAuth, (req, res) => res.json({ userId: req.userId }))
  return app
}

describe('requireAuth', () => {
  it('rejects a request with no Authorization header', async () => {
    const res = await request(buildTestApp()).get('/protected')
    expect(res.status).toBe(401)
  })

  it('rejects an invalid token', async () => {
    const res = await request(buildTestApp()).get('/protected').set('Authorization', 'Bearer garbage')
    expect(res.status).toBe(401)
  })

  it('attaches userId for a valid token', async () => {
    const token = signAccessToken({ userId: 'user_abc' })
    const res = await request(buildTestApp()).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ userId: 'user_abc' })
  })
})
