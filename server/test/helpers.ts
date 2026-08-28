import { prisma } from '../src/lib/prisma'
import { hashPassword } from '../src/lib/password'
import { signAccessToken } from '../src/lib/jwt'

export async function createTestUser(overrides: { email?: string; slug?: string } = {}) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const user = await prisma.user.create({
    data: {
      name: 'Test User',
      email: overrides.email ?? `test-${unique}@example.com`,
      passwordHash: await hashPassword('password123'),
      slug: overrides.slug ?? `test-${unique}`,
      timezone: 'America/Sao_Paulo',
    },
  })
  const accessToken = signAccessToken({ userId: user.id })
  return { user, accessToken }
}

export async function cleanDatabase() {
  await prisma.booking.deleteMany()
  await prisma.blockedSlot.deleteMany()
  await prisma.customFormField.deleteMany()
  await prisma.serviceTypeAvailabilityRule.deleteMany()
  await prisma.serviceType.deleteMany()
  await prisma.availability.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()
}
