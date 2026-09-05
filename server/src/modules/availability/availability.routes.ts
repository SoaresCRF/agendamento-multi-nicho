import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth'
import { availabilityListSchema } from './availability.schemas'
import * as service from './availability.service'

export const availabilityRouter = Router()
availabilityRouter.use(requireAuth)

availabilityRouter.get('/', async (req, res, next) => {
  try {
    res.json(await service.getGeneralAvailability(req.userId!))
  } catch (err) {
    next(err)
  }
})

availabilityRouter.put('/', async (req, res, next) => {
  try {
    const rules = availabilityListSchema.parse(req.body)
    res.json(await service.replaceGeneralAvailability(req.userId!, rules))
  } catch (err) {
    next(err)
  }
})
