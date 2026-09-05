import { Router } from 'express'
import { z } from 'zod'
import * as service from './public.service'
import { createPublicBooking } from '../bookings/bookings.service'
import { strictLimiter, publicReadLimiter } from '../../middleware/rateLimit'

export const publicRouter = Router()
publicRouter.use(publicReadLimiter)

publicRouter.get('/:slug', async (req, res, next) => {
  try {
    res.json(await service.getPublicProfile(req.params.slug))
  } catch (err) {
    next(err)
  }
})

publicRouter.get('/:slug/service-types', async (req, res, next) => {
  try {
    res.json(await service.listPublicServiceTypes(req.params.slug))
  } catch (err) {
    next(err)
  }
})

const dateQuerySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })

publicRouter.get('/:slug/service-types/:id/slots', async (req, res, next) => {
  try {
    const { date } = dateQuerySchema.parse(req.query)
    const slots = await service.getSlotsForDate(req.params.slug, req.params.id, date)
    res.json({ slots: slots.map((s) => s.toISOString()) })
  } catch (err) {
    next(err)
  }
})

const createBookingSchema = z.object({
  serviceTypeId: z.string().min(1),
  startsAt: z.string().datetime(),
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  formResponses: z.record(z.unknown()).optional(),
})

publicRouter.post('/:slug/bookings', strictLimiter, async (req, res, next) => {
  try {
    const input = createBookingSchema.parse(req.body)
    const booking = await createPublicBooking(req.params.slug, input)
    res.status(201).json({ id: booking.id, startsAt: booking.startsAt, endsAt: booking.endsAt, status: booking.status })
  } catch (err) {
    next(err)
  }
})
