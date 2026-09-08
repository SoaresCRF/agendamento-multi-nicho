import { prisma } from '../../lib/prisma'
import { AppError } from '../../lib/errors'
import { getAvailableSlots } from '../availability/engine'

const DAY_MS = 24 * 60 * 60 * 1000

const SITEMAP_PAGE_SIZE = 500

// Feeds the frontend's dynamically-generated sitemap.xml (client/middleware.ts) —
// crawlers have no other way to discover a professional's page than an external
// link, since the app itself has no directory/listing of professionals.
// Cursor-paginated (same shape as bookings.routes.ts) so the professional count
// growing large never turns this into one unbounded query.
export async function listPublicSlugs(cursor?: string, limit = SITEMAP_PAGE_SIZE) {
  const users = await prisma.user.findMany({
    select: { id: true, slug: true, updatedAt: true },
    orderBy: { id: 'asc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })
  const hasMore = users.length > limit
  const items = hasMore ? users.slice(0, limit) : users
  return {
    items: items.map((u) => ({ slug: u.slug, updatedAt: u.updatedAt })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  }
}

const PUBLIC_PROFILE_SELECT = { name: true, niche: true, timezone: true, profilePhotoUrl: true, bio: true } as const

export async function getPublicProfile(slug: string) {
  const user = await prisma.user.findUnique({ where: { slug }, select: PUBLIC_PROFILE_SELECT })
  if (!user) throw new AppError(404, 'Profissional não encontrado')
  return user
}

export async function listPublicServiceTypes(slug: string) {
  const user = await prisma.user.findUnique({ where: { slug }, select: { id: true } })
  if (!user) throw new AppError(404, 'Profissional não encontrado')
  const serviceTypes = await prisma.serviceType.findMany({
    where: { userId: user.id },
    include: { customFields: true },
  })
  return serviceTypes.map((st) => ({
    id: st.id,
    name: st.name,
    durationMinutes: st.durationMinutes,
    description: st.description,
    requiresCustomForm: st.requiresCustomForm,
    customFields: st.requiresCustomForm ? st.customFields : [],
  }))
}

async function fetchAvailabilityRules(userId: string, serviceTypeId: string) {
  const [generalRules, serviceTypeRules] = await Promise.all([
    prisma.availability.findMany({ where: { userId } }),
    prisma.serviceTypeAvailabilityRule.findMany({ where: { serviceTypeId } }),
  ])
  const toRows = (rows: { dayOfWeek: number; startTime: string; endTime: string }[]) =>
    rows.map((r) => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime }))
  return { generalRules: toRows(generalRules), serviceTypeRules: toRows(serviceTypeRules) }
}

// Shared by the public slot-listing endpoint and by booking creation itself, so a
// slot is never displayed as available by one code path and accepted by another
// through a separately-maintained (and potentially drifted) conflict check.
export async function computeAvailableSlots(
  userId: string,
  serviceType: { id: string; durationMinutes: number },
  date: string,
  timezone: string,
) {
  const { generalRules, serviceTypeRules } = await fetchAvailabilityRules(userId, serviceType.id)

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
    generalRules,
    serviceTypeRules,
    conflicts: [...bookings, ...blockedSlots].map((c) => ({ startsAt: c.startsAt, endsAt: c.endsAt })),
  })
}

// Powers the public calendar's "available" day highlight (DESIGN.md's
// calendar-day-cell-available) — without this, a client has to click every day
// blind to discover which ones have any open slot at all.
export async function computeAvailableDaysInMonth(
  userId: string,
  serviceType: { id: string; durationMinutes: number },
  month: string,
  timezone: string,
): Promise<string[]> {
  const { generalRules, serviceTypeRules } = await fetchAvailabilityRules(userId, serviceType.id)

  const [year, monthNum] = month.split('-').map(Number)
  const monthStart = new Date(Date.UTC(year, monthNum - 1, 1))
  const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate()
  const rangeStart = new Date(monthStart.getTime() - DAY_MS)
  const rangeEnd = new Date(monthStart.getTime() + (daysInMonth + 1) * DAY_MS)

  const [bookings, blockedSlots] = await Promise.all([
    prisma.booking.findMany({
      where: { userId, status: 'CONFIRMED', startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } },
    }),
    prisma.blockedSlot.findMany({ where: { userId, startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } } }),
  ])
  const conflicts = [...bookings, ...blockedSlots].map((c) => ({ startsAt: c.startsAt, endsAt: c.endsAt }))

  const availableDates: string[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`
    const slots = getAvailableSlots({
      date,
      timezone,
      durationMinutes: serviceType.durationMinutes,
      generalRules,
      serviceTypeRules,
      conflicts,
    })
    if (slots.length > 0) availableDates.push(date)
  }
  return availableDates
}

export async function getSlotsForDate(slug: string, serviceTypeId: string, date: string) {
  const user = await prisma.user.findUnique({ where: { slug }, select: { id: true, timezone: true } })
  if (!user) throw new AppError(404, 'Profissional não encontrado')
  const serviceType = await prisma.serviceType.findFirst({ where: { id: serviceTypeId, userId: user.id } })
  if (!serviceType) throw new AppError(404, 'Tipo de serviço não encontrado')

  return computeAvailableSlots(user.id, serviceType, date, user.timezone)
}

export async function getAvailableDaysForMonth(slug: string, serviceTypeId: string, month: string) {
  const user = await prisma.user.findUnique({ where: { slug }, select: { id: true, timezone: true } })
  if (!user) throw new AppError(404, 'Profissional não encontrado')
  const serviceType = await prisma.serviceType.findFirst({ where: { id: serviceTypeId, userId: user.id } })
  if (!serviceType) throw new AppError(404, 'Tipo de serviço não encontrado')

  return computeAvailableDaysInMonth(user.id, serviceType, month, user.timezone)
}
