import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../middleware/requireAuth'
import { createBlockedSlotSchema } from './blocked-slots.schemas'
import * as service from './blocked-slots.service'

export const blockedSlotsRouter = Router()
blockedSlotsRouter.use(requireAuth)

const listQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

blockedSlotsRouter.get('/', async (req, res, next) => {
  try {
    const { from, to } = listQuerySchema.parse(req.query)
    res.json(await service.listBlockedSlots(req.userId!, from, to))
  } catch (err) { next(err) }
})

blockedSlotsRouter.post('/', async (req, res, next) => {
  try {
    const input = createBlockedSlotSchema.parse(req.body)
    res.status(201).json(await service.createBlockedSlot(req.userId!, input))
  } catch (err) { next(err) }
})

blockedSlotsRouter.delete('/:id', async (req, res, next) => {
  try {
    await service.deleteBlockedSlot(req.userId!, req.params.id)
    res.status(204).send()
  } catch (err) { next(err) }
})
