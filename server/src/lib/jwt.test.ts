import { describe, it, expect, beforeEach } from 'vitest'

describe('jwt', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'a'.repeat(32)
    process.env.DATABASE_URL = 'postgresql://x'
  })

  it('signs and verifies a valid access token', async () => {
    const { signAccessToken, verifyAccessToken } = await import('./jwt')
    const token = signAccessToken({ userId: 'user_123' })
    expect(verifyAccessToken(token)).toEqual({ userId: 'user_123' })
  })

  it('returns null for a tampered token', async () => {
    const { signAccessToken, verifyAccessToken } = await import('./jwt')
    const token = signAccessToken({ userId: 'user_123' })
    expect(verifyAccessToken(token + 'x')).toBeNull()
  })
})
