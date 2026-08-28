import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from './app'

describe('GET /health', () => {
  it('returns ok: true', async () => {
    const app = createApp()
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('sets security headers without blocking cross-origin reads from the frontend', async () => {
    const app = createApp()
    const res = await request(app).get('/health')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN')
    // helmet defaults this to 'same-origin', which would block the separately-hosted
    // frontend from reading responses even though CORS allows it — must stay 'cross-origin'.
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin')
  })
})
