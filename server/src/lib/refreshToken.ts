import { randomBytes, createHash } from 'node:crypto'

export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
