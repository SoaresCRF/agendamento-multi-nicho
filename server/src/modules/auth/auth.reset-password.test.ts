import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { prisma } from '../../lib/prisma'
import { requestPasswordReset, resetPassword, loginUser, issueTokens, refreshSession } from './auth.service'
import { AppError } from '../../lib/errors'
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

async function getResetToken(email: string): Promise<string> {
  const { mailer, sent } = fakeMailer()
  await requestPasswordReset(email, mailer)
  return sent[0].html.match(/redefinir-senha\?token=([^"&\s]+)/)![1]
}

describe('resetPassword', () => {
  beforeEach(cleanDatabase)

  it('changes the password so the new one logs in and the old one no longer works', async () => {
    await createTestUser({ email: 'p1@example.com' })
    const token = await getResetToken('p1@example.com')

    await resetPassword(token, 'brand-new-password')

    await expect(loginUser('p1@example.com', 'brand-new-password')).resolves.toBeDefined()
    await expect(loginUser('p1@example.com', 'password123')).rejects.toThrow(AppError)
  })

  it('revokes existing sessions so an old refresh token stops working', async () => {
    const { user } = await createTestUser({ email: 'p2@example.com' })
    const { refreshToken } = await issueTokens(user.id, {
      id: user.id,
      name: user.name,
      email: user.email,
      slug: user.slug,
    })
    const token = await getResetToken('p2@example.com')

    await resetPassword(token, 'brand-new-password')

    await expect(refreshSession(refreshToken)).rejects.toThrow(AppError)
  })

  it('rejects a garbage/unknown token', async () => {
    await expect(resetPassword('not-a-real-token', 'brand-new-password')).rejects.toThrow(AppError)
  })

  it('rejects an expired token', async () => {
    await createTestUser({ email: 'p3@example.com' })
    const token = await getResetToken('p3@example.com')
    await prisma.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } })

    await expect(resetPassword(token, 'brand-new-password')).rejects.toThrow(AppError)
  })

  it('rejects a token that was already used', async () => {
    await createTestUser({ email: 'p4@example.com' })
    const token = await getResetToken('p4@example.com')
    await resetPassword(token, 'brand-new-password')

    await expect(resetPassword(token, 'another-password')).rejects.toThrow(AppError)
  })
})

function extractCookie(res: request.Response) {
  const raw = res.headers['set-cookie']?.[0] as string
  return raw.split(';')[0]
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(cleanDatabase)

  it('rejects a password shorter than 10 characters with 400', async () => {
    const app = createApp()
    const res = await request(app).post('/api/auth/reset-password').send({ token: 'whatever', password: 'short' })
    expect(res.status).toBe(400)
  })

  it('rejects an invalid token with 400', async () => {
    const app = createApp()
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'not-a-real-token', password: 'brand-new-password' })
    expect(res.status).toBe(400)
  })

  it('resets the password end-to-end: old session dies, new password logs in', async () => {
    const app = createApp()
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Joana',
      email: 'e2e@example.com',
      password: 'password123',
      slug: 'e2e-reset',
      timezone: 'America/Sao_Paulo',
    })
    const oldCookie = extractCookie(registerRes)
    const token = await getResetToken('e2e@example.com')

    const resetRes = await request(app).post('/api/auth/reset-password').send({ token, password: 'brand-new-password' })
    expect(resetRes.status).toBe(204)

    const oldLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'e2e@example.com', password: 'password123' })
    expect(oldLoginRes.status).toBe(401)

    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'e2e@example.com', password: 'brand-new-password' })
    expect(newLoginRes.status).toBe(200)

    const refreshRes = await request(app).post('/api/auth/refresh').set('Cookie', oldCookie)
    expect(refreshRes.status).toBe(401)
  })
})
