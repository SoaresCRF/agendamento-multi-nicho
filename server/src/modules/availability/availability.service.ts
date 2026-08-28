import { prisma } from '../../lib/prisma'
import type { z } from 'zod'
import type { availabilityListSchema } from './availability.schemas'

type Rules = z.infer<typeof availabilityListSchema>

export function getGeneralAvailability(userId: string) {
  return prisma.availability.findMany({ where: { userId }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] })
}

export async function replaceGeneralAvailability(userId: string, rules: Rules) {
  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { userId } }),
    prisma.availability.createMany({ data: rules.map((r) => ({ ...r, userId })) }),
  ])
  return getGeneralAvailability(userId)
}
