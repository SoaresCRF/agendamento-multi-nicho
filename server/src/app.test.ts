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

// Regression guard: catches a future route added to one of these routers without
// requireAuth wired (silently reachable without a token) — nothing else in the
// suite would fail if that happened, since per-module tests all supply a valid token.
describe('protected routers reject unauthenticated requests', () => {
  const protectedPaths = [
    '/api/me',
    '/api/service-types',
    '/api/availability',
    '/api/service-types/any-id/availability-rules',
    '/api/blocked-slots',
    '/api/bookings',
  ]

  it.each(protectedPaths)('GET %s returns 401 without a token', async (path) => {
    const app = createApp()
    const res = await request(app).get(path)
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Não autenticado' })
  })
})
