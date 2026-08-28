import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth'
import { createBlockedSlotSchema } from './blocked-slots.schemas'
import * as service from './blocked-slots.service'

export const blockedSlotsRouter = Router()
blockedSlotsRouter.use(requireAuth)

blockedSlotsRouter.get('/', async (req, res, next) => {
  try {
    res.json(await service.listBlockedSlots(req.userId!))
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
