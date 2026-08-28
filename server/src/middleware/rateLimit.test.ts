import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { rateLimit } from 'express-rate-limit'

describe('rate limiting', () => {
  it('blocks a client after it exceeds the configured limit', async () => {
    const app = express()
    app.use(rateLimit({ windowMs: 60_000, limit: 2, standardHeaders: true, legacyHeaders: false }))
    app.get('/x', (_req, res) => res.json({ ok: true }))

    const first = await request(app).get('/x')
    const second = await request(app).get('/x')
    const third = await request(app).get('/x')

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(third.status).toBe(429)
  })
})
