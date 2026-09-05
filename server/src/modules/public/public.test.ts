import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { cleanDatabase, createTestUser } from '../../../test/helpers'
import { prisma } from '../../lib/prisma'

describe('public booking-page endpoints', () => {
  beforeEach(cleanDatabase)

  it('returns the public profile by slug', async () => {
    const { user } = await createTestUser({ email: 'pub@example.com', slug: 'pub-slug' })
    await prisma.user.update({ where: { id: user.id }, data: { niche: 'Psicologia' } })
    const res = await request(createApp()).get('/api/public/pub-slug')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ niche: 'Psicologia', timezone: 'America/Sao_Paulo' })
  })

  it('returns 404 for an unknown slug', async () => {
    const res = await request(createApp()).get('/api/public/does-not-exist')
    expect(res.status).toBe(404)
  })

  it('does not cache a 404 for an unknown slug', async () => {
    const res = await request(createApp()).get('/api/public/does-not-exist')
    expect(res.headers['cache-control'] ?? '').not.toMatch(/public, max-age/)
  })

  it('sets a short public cache on the profile, since it rarely changes', async () => {
    await createTestUser({ email: 'cache@example.com', slug: 'cache-slug' })
    const res = await request(createApp()).get('/api/public/cache-slug')
    expect(res.headers['cache-control']).toMatch(/public, max-age=\d+/)
  })

  it('sets a short public cache on the service-type list', async () => {
    const { user } = await createTestUser({ email: 'cache2@example.com', slug: 'cache2-slug' })
    await prisma.serviceType.create({ data: { userId: user.id, name: 'Sessão', durationMinutes: 30 } })
    const res = await request(createApp()).get('/api/public/cache2-slug/service-types')
    expect(res.headers['cache-control']).toMatch(/public, max-age=\d+/)
  })

  it('lists every professional slug for the sitemap, without requiring auth', async () => {
    await createTestUser({ email: 'sm1@example.com', slug: 'sm1-slug' })
    await createTestUser({ email: 'sm2@example.com', slug: 'sm2-slug' })
    const res = await request(createApp()).get('/api/public/sitemap-slugs')
    expect(res.status).toBe(200)
    expect(res.body.map((r: { slug: string }) => r.slug).sort()).toEqual(['sm1-slug', 'sm2-slug'])
    expect(res.body[0]).toHaveProperty('updatedAt')
  })

  it('never caches available slots, since they change on every booking/cancellation', async () => {
    const { user } = await createTestUser({ email: 'cache3@example.com', slug: 'cache3-slug' })
    const serviceType = await prisma.serviceType.create({
      data: { userId: user.id, name: 'Sessão', durationMinutes: 60 },
    })
    const res = await request(createApp()).get(
      `/api/public/cache3-slug/service-types/${serviceType.id}/slots?date=2026-09-07`,
    )
    expect(res.headers['cache-control'] ?? '').not.toMatch(/max-age/)
  })

  it('lists service types, including custom fields only when required', async () => {
    const { user } = await createTestUser({ email: 'st@example.com', slug: 'st-slug' })
    await prisma.serviceType.create({ data: { userId: user.id, name: 'Sem form', durationMinutes: 30 } })
    await prisma.serviceType.create({
      data: {
        userId: user.id,
        name: 'Com form',
        durationMinutes: 60,
        requiresCustomForm: true,
        customFields: { create: [{ label: 'Objetivo', fieldType: 'TEXT', required: true, order: 0 }] },
      },
    })
    const res = await request(createApp()).get('/api/public/st-slug/service-types')
    expect(res.body).toHaveLength(2)
    const withForm = res.body.find((s: { requiresCustomForm: boolean }) => s.requiresCustomForm)
    expect(withForm.customFields).toHaveLength(1)
    const withoutForm = res.body.find((s: { requiresCustomForm: boolean }) => !s.requiresCustomForm)
    expect(withoutForm.customFields).toHaveLength(0)
  })

  it('returns available slots for a date, respecting general availability', async () => {
    const { user } = await createTestUser({ email: 'slots@example.com', slug: 'slots-slug' })
    await prisma.availability.create({ data: { userId: user.id, dayOfWeek: 1, startTime: '09:00', endTime: '10:00' } })
    const serviceType = await prisma.serviceType.create({
      data: { userId: user.id, name: 'Sessão', durationMinutes: 60 },
    })

    const res = await request(createApp()).get(
      `/api/public/slots-slug/service-types/${serviceType.id}/slots?date=2026-09-07`,
    )
    expect(res.status).toBe(200)
    expect(res.body.slots).toEqual(['2026-09-07T12:00:00.000Z'])
  })
})
