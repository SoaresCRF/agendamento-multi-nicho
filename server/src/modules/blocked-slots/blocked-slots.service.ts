import { prisma } from '../../lib/prisma'
import { AppError } from '../../lib/errors'

export function listBlockedSlots(userId: string) {
  return prisma.blockedSlot.findMany({ where: { userId }, orderBy: { startsAt: 'asc' } })
}

export function createBlockedSlot(userId: string, input: { startsAt: string; endsAt: string; reason?: string }) {
  return prisma.blockedSlot.create({
    data: { userId, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt), reason: input.reason },
  })
}

export async function deleteBlockedSlot(userId: string, id: string) {
  const blockedSlot = await prisma.blockedSlot.findFirst({ where: { id, userId } })
  if (!blockedSlot) throw new AppError(404, 'Bloqueio não encontrado')
  await prisma.blockedSlot.delete({ where: { id, userId } })
}
