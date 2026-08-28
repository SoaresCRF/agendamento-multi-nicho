import { prisma } from '../../lib/prisma'
import { AppError } from '../../lib/errors'
import { getAvailableSlots } from '../availability/engine'

const DAY_MS = 24 * 60 * 60 * 1000

export async function getPublicProfile(slug: string) {
  const user = await prisma.user.findUnique({ where: { slug } })
  if (!user) throw new AppError(404, 'Profissional não encontrado')
  return { name: user.name, niche: user.niche, timezone: user.timezone }
}

export async function listPublicServiceTypes(slug: string) {
  const user = await prisma.user.findUnique({ where: { slug } })
  if (!user) throw new AppError(404, 'Profissional não encontrado')
  const serviceTypes = await prisma.serviceType.findMany({ where: { userId: user.id }, include: { customFields: true } })
  return serviceTypes.map((st) => ({
    id: st.id,
    name: st.name,
    durationMinutes: st.durationMinutes,
    description: st.description,
    requiresCustomForm: st.requiresCustomForm,
    customFields: st.requiresCustomForm ? st.customFields : [],
  }))
}

export async function getSlotsForDate(slug: string, serviceTypeId: string, date: string) {
  const user = await prisma.user.findUnique({ where: { slug } })
  if (!user) throw new AppError(404, 'Profissional não encontrado')
  const serviceType = await prisma.serviceType.findFirst({ where: { id: serviceTypeId, userId: user.id } })
  if (!serviceType) throw new AppError(404, 'Tipo de serviço não encontrado')

  const [generalRules, serviceTypeRules] = await Promise.all([
    prisma.availability.findMany({ where: { userId: user.id } }),
    prisma.serviceTypeAvailabilityRule.findMany({ where: { serviceTypeId } }),
  ])

  const dayStart = new Date(`${date}T00:00:00Z`)
  const rangeStart = new Date(dayStart.getTime() - DAY_MS)
  const rangeEnd = new Date(dayStart.getTime() + 2 * DAY_MS)

  const [bookings, blockedSlots] = await Promise.all([
    prisma.booking.findMany({
      where: { userId: user.id, status: 'CONFIRMED', startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } },
    }),
    prisma.blockedSlot.findMany({ where: { userId: user.id, startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } } }),
  ])

  return getAvailableSlots({
    date,
    timezone: user.timezone,
    durationMinutes: serviceType.durationMinutes,
    generalRules: generalRules.map((r) => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime })),
    serviceTypeRules: serviceTypeRules.map((r) => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime })),
    conflicts: [...bookings, ...blockedSlots].map((c) => ({ startsAt: c.startsAt, endsAt: c.endsAt })),
  })
}
