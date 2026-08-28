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

  it('lists service types, including custom fields only when required', async () => {
    const { user } = await createTestUser({ email: 'st@example.com', slug: 'st-slug' })
    await prisma.serviceType.create({ data: { userId: user.id, name: 'Sem form', durationMinutes: 30 } })
    await prisma.serviceType.create({
      data: {
        userId: user.id, name: 'Com form', durationMinutes: 60, requiresCustomForm: true,
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
    const serviceType = await prisma.serviceType.create({ data: { userId: user.id, name: 'Sessão', durationMinutes: 60 } })

    const res = await request(createApp()).get(`/api/public/slots-slug/service-types/${serviceType.id}/slots?date=2026-09-07`)
    expect(res.status).toBe(200)
    expect(res.body.slots).toEqual(['2026-09-07T12:00:00.000Z'])
  })
})
