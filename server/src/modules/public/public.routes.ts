import { Router } from 'express'
import { z } from 'zod'
import * as service from './public.service'

export const publicRouter = Router()

publicRouter.get('/:slug', async (req, res, next) => {
  try {
    res.json(await service.getPublicProfile(req.params.slug))
  } catch (err) { next(err) }
})

publicRouter.get('/:slug/service-types', async (req, res, next) => {
  try {
    res.json(await service.listPublicServiceTypes(req.params.slug))
  } catch (err) { next(err) }
})

const dateQuerySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })

publicRouter.get('/:slug/service-types/:id/slots', async (req, res, next) => {
  try {
    const { date } = dateQuerySchema.parse(req.query)
    const slots = await service.getSlotsForDate(req.params.slug, req.params.id, date)
    res.json({ slots: slots.map((s) => s.toISOString()) })
  } catch (err) { next(err) }
})
