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

// Shared by the public slot-listing endpoint and by booking creation itself, so a
// slot is never displayed as available by one code path and accepted by another
// through a separately-maintained (and potentially drifted) conflict check.
export async function computeAvailableSlots(
  userId: string,
  serviceType: { id: string; durationMinutes: number },
  date: string,
  timezone: string
) {
  const [generalRules, serviceTypeRules] = await Promise.all([
    prisma.availability.findMany({ where: { userId } }),
    prisma.serviceTypeAvailabilityRule.findMany({ where: { serviceTypeId: serviceType.id } }),
  ])

  const dayStart = new Date(`${date}T00:00:00Z`)
  const rangeStart = new Date(dayStart.getTime() - DAY_MS)
  const rangeEnd = new Date(dayStart.getTime() + 2 * DAY_MS)

  const [bookings, blockedSlots] = await Promise.all([
    prisma.booking.findMany({
      where: { userId, status: 'CONFIRMED', startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } },
    }),
    prisma.blockedSlot.findMany({ where: { userId, startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } } }),
  ])

  return getAvailableSlots({
    date,
    timezone,
    durationMinutes: serviceType.durationMinutes,
    generalRules: generalRules.map((r) => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime })),
    serviceTypeRules: serviceTypeRules.map((r) => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime })),
    conflicts: [...bookings, ...blockedSlots].map((c) => ({ startsAt: c.startsAt, endsAt: c.endsAt })),
  })
}

export async function getSlotsForDate(slug: string, serviceTypeId: string, date: string) {
  const user = await prisma.user.findUnique({ where: { slug } })
  if (!user) throw new AppError(404, 'Profissional não encontrado')
  const serviceType = await prisma.serviceType.findFirst({ where: { id: serviceTypeId, userId: user.id } })
  if (!serviceType) throw new AppError(404, 'Tipo de serviço não encontrado')

  return computeAvailableSlots(user.id, serviceType, date, user.timezone)
}
