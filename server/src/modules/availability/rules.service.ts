import { prisma } from '../../lib/prisma'
import { AppError } from '../../lib/errors'
import type { z } from 'zod'
import type { availabilityListSchema } from './availability.schemas'

type Rules = z.infer<typeof availabilityListSchema>

async function assertOwnership(userId: string, serviceTypeId: string) {
  const serviceType = await prisma.serviceType.findFirst({ where: { id: serviceTypeId, userId } })
  if (!serviceType) throw new AppError(404, 'Tipo de serviço não encontrado')
}

export async function getServiceTypeRules(userId: string, serviceTypeId: string) {
  await assertOwnership(userId, serviceTypeId)
  return prisma.serviceTypeAvailabilityRule.findMany({
    where: { serviceTypeId }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })
}

export async function replaceServiceTypeRules(userId: string, serviceTypeId: string, rules: Rules) {
  await assertOwnership(userId, serviceTypeId)
  await prisma.$transaction([
    prisma.serviceTypeAvailabilityRule.deleteMany({ where: { serviceTypeId } }),
    prisma.serviceTypeAvailabilityRule.createMany({ data: rules.map((r) => ({ ...r, serviceTypeId })) }),
  ])
  return getServiceTypeRules(userId, serviceTypeId)
}
