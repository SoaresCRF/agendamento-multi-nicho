import { Router } from 'express'
import { z } from 'zod'
import * as service from './public.service'
import { createPublicBooking } from '../bookings/bookings.service'
import { strictLimiter, publicReadLimiter } from '../../middleware/rateLimit'

export const publicRouter = Router()
publicRouter.use(publicReadLimiter)

// A profile or its service-type list changes only when the professional edits their
// own settings, so browsers/CDNs can shave repeat DB hits off the public booking page
// with a short cache. Available slots are deliberately excluded — those change on
// every booking/cancellation, and staleness there would show a slot as free right
// after someone else just took it.
const PUBLIC_CACHE_HEADER = 'public, max-age=30'

// Must stay registered before GET /:slug — otherwise Express would match this
// path as a (nonexistent) professional slug instead.
publicRouter.get('/sitemap-slugs', async (_req, res, next) => {
  try {
    const slugs = await service.listPublicSlugs()
    res.set('Cache-Control', PUBLIC_CACHE_HEADER)
    res.json(slugs)
  } catch (err) {
    next(err)
  }
})

publicRouter.get('/:slug', async (req, res, next) => {
  try {
    const profile = await service.getPublicProfile(req.params.slug)
    res.set('Cache-Control', PUBLIC_CACHE_HEADER)
    res.json(profile)
  } catch (err) {
    next(err)
  }
})

publicRouter.get('/:slug/service-types', async (req, res, next) => {
  try {
    const serviceTypes = await service.listPublicServiceTypes(req.params.slug)
    res.set('Cache-Control', PUBLIC_CACHE_HEADER)
    res.json(serviceTypes)
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
