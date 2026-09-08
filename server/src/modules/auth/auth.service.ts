import { prisma } from '../../lib/prisma'
import { hashPassword, verifyPassword } from '../../lib/password'
import { signAccessToken } from '../../lib/jwt'
import { generateRefreshToken, hashToken, REFRESH_TOKEN_TTL_MS } from '../../lib/refreshToken'
import { AppError } from '../../lib/errors'
import { logger } from '../../lib/logger'
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
      name: input.name,
      email: input.email,
      passwordHash,
      slug: input.slug,
      timezone: input.timezone,
      niche: input.niche,
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

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    // Never log the attempted password — email alone is enough to spot brute-force/
    // credential-stuffing patterns without putting a real credential in the logs.
    logger.warn('Login failed', { email })
    throw new AppError(401, 'Credenciais inválidas')
  }
  return issueTokens(user.id, { id: user.id, name: user.name, email: user.email, slug: user.slug })
}

export async function refreshSession(refreshToken: string): Promise<AuthResult> {
  const tokenHash = hashToken(refreshToken)
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } })
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw new AppError(401, 'Sessão inválida, faça login novamente')
  }
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } })
  return issueTokens(record.userId, {
    id: record.user.id,
    name: record.user.name,
    email: record.user.email,
    slug: record.user.slug,
  })
}

export async function logoutUser(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken)
  await prisma.refreshToken.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } })
}
