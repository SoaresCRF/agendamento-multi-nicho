import jwt from 'jsonwebtoken'
import { env } from './env'

export interface AccessTokenPayload {
  userId: string
}

const ACCESS_TOKEN_TTL = '15m'

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL })
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload & { iat?: number; exp?: number }
    return { userId: decoded.userId }
  } catch {
    return null
  }
}
