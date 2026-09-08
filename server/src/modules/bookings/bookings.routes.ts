import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../middleware/requireAuth'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../lib/errors'
import { decryptJson } from '../../lib/fieldEncryption'

export const bookingsRouter = Router()
bookingsRouter.use(requireAuth)

const DEFAULT_PAGE_SIZE = 100
const MAX_PAGE_SIZE = 200

const listQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: z.enum(['CONFIRMED', 'CANCELLED']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

bookingsRouter.get('/', async (req, res, next) => {
  try {
    const { from, to, status, cursor, limit } = listQuerySchema.parse(req.query)
    if (cursor) {
      // Prisma's cursor pagination resolves `cursor: { id }` by the row's global unique
      // id before the `where` filter runs, so an id from another professional's booking
      // would otherwise be accepted as a valid pagination anchor for this query.
      const cursorBooking = await prisma.booking.findFirst({ where: { id: cursor, userId: req.userId! } })
      if (!cursorBooking) throw new AppError(400, 'Cursor inválido')
    }
    const bookings = await prisma.booking.findMany({
      where: {
        userId: req.userId!,
        status,
        startsAt: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined },
      },
      include: { serviceType: true },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })
    const hasMore = bookings.length > limit
    const sliced = hasMore ? bookings.slice(0, limit) : bookings
    const items = sliced.map((b) => ({
      ...b,
      formResponses: b.formResponses ? decryptJson(b.formResponses) : null,
    }))
    res.json({ items, nextCursor: hasMore ? sliced[sliced.length - 1].id : null })
  } catch (err) {
    next(err)
  }
})

bookingsRouter.patch('/:id/cancel', async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({ where: { id: req.params.id, userId: req.userId! } })
    if (!booking) throw new AppError(404, 'Agendamento não encontrado')
    const updated = await prisma.booking.update({
      where: { id: booking.id, userId: req.userId! },
      data: { status: 'CANCELLED' },
    })
    res.json(updated)
  } catch (err) {
    next(err)
  }
})
