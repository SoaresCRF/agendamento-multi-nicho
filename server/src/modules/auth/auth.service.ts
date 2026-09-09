import { prisma } from '../../lib/prisma'
import { hashPassword, verifyPassword } from '../../lib/password'
import { signAccessToken } from '../../lib/jwt'
import { generateRefreshToken, hashToken, REFRESH_TOKEN_TTL_MS } from '../../lib/refreshToken'
import { AppError } from '../../lib/errors'
import { logger } from '../../lib/logger'
import { env } from '../../lib/env'
import type { Mailer } from '../../lib/email'
import { nodemailerMailer } from '../../lib/email/nodemailer'
import type { z } from 'zod'
import type { registerSchema } from './auth.schemas'

const PASSWORD_RESET_TOKEN_TTL_MS = 20 * 60 * 1000

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

// Always resolves without revealing whether the email exists — an existing-user branch
// that awaits SMTP while a non-existent one returns immediately would leak that fact
// through response timing, so the fire-and-forget email send matches bookings.service.ts.
export async function requestPasswordReset(email: string, mailer: Mailer = nodemailerMailer): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return

  // Only one valid link at a time.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } })

  const token = generateRefreshToken()
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    },
  })

  const resetUrl = `${env.CLIENT_ORIGIN}/redefinir-senha?token=${token}`
  mailer
    .sendMail({
      to: user.email,
      subject: 'Redefinição de senha',
      html: `<p>Recebemos um pedido para redefinir sua senha. O link abaixo expira em 20 minutos:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Se você não pediu isso, ignore este e-mail.</p>`,
    })
    .catch((err) => {
      logger.error('Failed to send password reset email', {
        message: err instanceof Error ? err.message : String(err),
      })
    })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError(400, 'Link inválido ou expirado')
  }

  const passwordHash = await hashPassword(newPassword)
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // A password reset means any previously issued session may be compromised —
    // sign the user out everywhere, not just on the device that reset it.
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ])
}
