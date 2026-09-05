import { prisma } from '../../lib/prisma'
import { AppError } from '../../lib/errors'
import type { z } from 'zod'
import type { serviceTypeInputSchema } from './service-types.schemas'

export type ServiceTypeInput = z.infer<typeof serviceTypeInputSchema>

export function listServiceTypes(userId: string) {
  return prisma.serviceType.findMany({
    where: { userId },
    include: { customFields: true },
    orderBy: { createdAt: 'asc' },
  })
}

export function createServiceType(userId: string, input: ServiceTypeInput) {
  return prisma.serviceType.create({
    data: {
      userId,
      name: input.name,
      durationMinutes: input.durationMinutes,
      description: input.description,
      requiresCustomForm: input.requiresCustomForm,
      customFields: { create: input.customFields.map((f) => ({ ...f, options: f.options ?? undefined })) },
    },
    include: { customFields: true },
  })
}

export async function getServiceType(userId: string, id: string) {
  const serviceType = await prisma.serviceType.findFirst({ where: { id, userId }, include: { customFields: true } })
  if (!serviceType) throw new AppError(404, 'Tipo de serviço não encontrado')
  return serviceType
}

export async function updateServiceType(userId: string, id: string, input: ServiceTypeInput) {
  await getServiceType(userId, id)
  await prisma.customFormField.deleteMany({ where: { serviceTypeId: id } })
  return prisma.serviceType.update({
    where: { id, userId },
    data: {
      name: input.name,
      durationMinutes: input.durationMinutes,
      description: input.description,
      requiresCustomForm: input.requiresCustomForm,
      customFields: { create: input.customFields.map((f) => ({ ...f, options: f.options ?? undefined })) },
    },
    include: { customFields: true },
  })
}

export async function deleteServiceType(userId: string, id: string) {
  await getServiceType(userId, id)
  try {
    await prisma.serviceType.delete({ where: { id, userId } })
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'P2003') {
      throw new AppError(409, 'Cancele os agendamentos antes de remover este tipo de serviço')
    }
    throw err
  }
}
