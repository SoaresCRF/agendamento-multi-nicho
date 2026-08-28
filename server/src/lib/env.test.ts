import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('env', () => {
  const original = { ...process.env }

  beforeEach(() => {
    process.env = { ...original, DATABASE_URL: 'postgresql://x', JWT_SECRET: 'a'.repeat(32) }
  })

  afterEach(() => {
    process.env = original
  })

  it('parses valid env vars with defaults applied', async () => {
    vi.resetModules()
    const { env } = await import('./env')
    expect(env.DATABASE_URL).toBe('postgresql://x')
    expect(env.PORT).toBe(3000)
    expect(env.CLIENT_ORIGIN).toBe('http://localhost:5173')
  })

  it('throws when JWT_SECRET is missing', async () => {
    delete process.env.JWT_SECRET
    vi.resetModules()
    await expect(import('./env')).rejects.toThrow()
  })
})
