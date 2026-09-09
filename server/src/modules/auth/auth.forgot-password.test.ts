import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { prisma } from '../../lib/prisma'
import { requestPasswordReset } from './auth.service'
import { hashToken } from '../../lib/refreshToken'
import { cleanDatabase, createTestUser } from '../../../test/helpers'
import type { Mailer, SendMailInput } from '../../lib/email'

function fakeMailer(): { mailer: Mailer; sent: SendMailInput[] } {
  const sent: SendMailInput[] = []
  return {
    mailer: {
      sendMail: async (input) => {
        sent.push(input)
      },
    },
    sent,
  }
}

describe('requestPasswordReset', () => {
  beforeEach(cleanDatabase)

  it('creates a hashed, time-limited token and emails a reset link to the user', async () => {
    const { user } = await createTestUser({ email: 'reset@example.com' })
    const { mailer, sent } = fakeMailer()

    await requestPasswordReset('reset@example.com', mailer)

    const tokenRow = await prisma.passwordResetToken.findFirst({ where: { userId: user.id } })
    expect(tokenRow).not.toBeNull()
    expect(tokenRow!.usedAt).toBeNull()
    expect(tokenRow!.expiresAt.getTime()).toBeGreaterThan(Date.now())

    expect(sent).toHaveLength(1)
    expect(sent[0].to).toBe('reset@example.com')
    const match = sent[0].html.match(/redefinir-senha\?token=([^"&\s]+)/)
    expect(match).not.toBeNull()
    expect(hashToken(match![1])).toBe(tokenRow!.tokenHash)
  })

  it('does nothing (no token, no email) for an email that has no account', async () => {
    const { mailer, sent } = fakeMailer()

    await requestPasswordReset('nobody@example.com', mailer)

    expect(sent).toHaveLength(0)
    expect(await prisma.passwordResetToken.count()).toBe(0)
  })

  it('requesting again invalidates the previous token', async () => {
    const { user } = await createTestUser({ email: 'reset2@example.com' })
    const { mailer: mailer1 } = fakeMailer()
    await requestPasswordReset('reset2@example.com', mailer1)
    const firstToken = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } })

    const { mailer: mailer2 } = fakeMailer()
    await requestPasswordReset('reset2@example.com', mailer2)

    const remaining = await prisma.passwordResetToken.findMany({ where: { userId: user.id } })
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).not.toBe(firstToken.id)
  })
})

// These two hit the HTTP route directly (no injected mailer) because the request never
// reaches the mailer — an invalid email fails Zod validation, and a non-existent account
// short-circuits in requestPasswordReset. A route test that DOES trigger an email would
// hit the real nodemailerMailer (network), so that case is covered at the service level
// above instead, matching bookings.create.test.ts's approach to the same constraint.
describe('POST /api/auth/forgot-password', () => {
  beforeEach(cleanDatabase)

  it('rejects an invalid email with 400', async () => {
    const app = createApp()
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'not-an-email' })
    expect(res.status).toBe(400)
  })

  it('responds with a generic message even when the account does not exist', async () => {
    const app = createApp()
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/e-mail/i)
  })
})
