import { describe, it, expect } from 'vitest'
import { generateRefreshToken, hashToken } from './refreshToken'

describe('refreshToken utils', () => {
  it('generates unique tokens and hashes them deterministically', () => {
    const a = generateRefreshToken()
    const b = generateRefreshToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(32)
    expect(hashToken(a)).toBe(hashToken(a))
    expect(hashToken(a)).not.toBe(hashToken(b))
  })
})
