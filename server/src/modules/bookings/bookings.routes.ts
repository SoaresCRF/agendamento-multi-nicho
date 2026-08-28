import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../middleware/requireAuth'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../lib/errors'

export const bookingsRouter = Router()
bookingsRouter.use(requireAuth)

const listQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: z.enum(['CONFIRMED', 'CANCELLED']).optional(),
})

bookingsRouter.get('/', async (req, res, next) => {
  try {
    const { from, to, status } = listQuerySchema.parse(req.query)
    const bookings = await prisma.booking.findMany({
      where: {
        userId: req.userId!,
        status,
        startsAt: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined },
      },
      include: { serviceType: true },
      orderBy: { startsAt: 'asc' },
    })
    res.json(bookings)
  } catch (err) { next(err) }
})

bookingsRouter.patch('/:id/cancel', async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({ where: { id: req.params.id, userId: req.userId! } })
    if (!booking) throw new AppError(404, 'Agendamento não encontrado')
    const updated = await prisma.booking.update({ where: { id: booking.id, userId: req.userId! }, data: { status: 'CANCELLED' } })
    res.json(updated)
  } catch (err) { next(err) }
})
