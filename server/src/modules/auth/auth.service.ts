import { prisma } from '../../lib/prisma'
import { hashPassword } from '../../lib/password'
import { signAccessToken } from '../../lib/jwt'
import { generateRefreshToken, hashToken, REFRESH_TOKEN_TTL_MS } from '../../lib/refreshToken'
import { AppError } from '../../lib/errors'
import type { z } from 'zod'
import type { registerSchema } from './auth.schemas'

export type RegisterInput = z.infer<typeof registerSchema>

export interface AuthResult {
  user: { id: string; name: string; email: string; slug: string }
  accessToken: string
  refreshToken: string
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findFirst({ where: { OR: [{ email: input.email }, { slug: input.slug }] } })
  if (existing) {
    throw new AppError(409, 'E-mail ou slug já em uso')
  }
  const passwordHash = await hashPassword(input.password)
  const user = await prisma.user.create({
    data: {
      name: input.name, email: input.email, passwordHash,
      slug: input.slug, timezone: input.timezone, niche: input.niche,
    },
  })
  return issueTokens(user.id, { id: user.id, name: user.name, email: user.email, slug: user.slug })
}

export async function issueTokens(userId: string, user: AuthResult['user']): Promise<AuthResult> {
  const refreshToken = generateRefreshToken()
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) },
  })
  return { user, accessToken: signAccessToken({ userId }), refreshToken }
}
