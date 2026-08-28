import { Router } from 'express'
import { requireAuth } from '../../middleware/requireAuth'
import { serviceTypeInputSchema } from './service-types.schemas'
import * as service from './service-types.service'

export const serviceTypesRouter = Router()
serviceTypesRouter.use(requireAuth)

serviceTypesRouter.get('/', async (req, res, next) => {
  try {
    res.json(await service.listServiceTypes(req.userId!))
  } catch (err) { next(err) }
})

serviceTypesRouter.post('/', async (req, res, next) => {
  try {
    const input = serviceTypeInputSchema.parse(req.body)
    res.status(201).json(await service.createServiceType(req.userId!, input))
  } catch (err) { next(err) }
})

serviceTypesRouter.get('/:id', async (req, res, next) => {
  try {
    res.json(await service.getServiceType(req.userId!, req.params.id))
  } catch (err) { next(err) }
})

serviceTypesRouter.patch('/:id', async (req, res, next) => {
  try {
    const input = serviceTypeInputSchema.parse(req.body)
    res.json(await service.updateServiceType(req.userId!, req.params.id, input))
  } catch (err) { next(err) }
})

serviceTypesRouter.delete('/:id', async (req, res, next) => {
  try {
    await service.deleteServiceType(req.userId!, req.params.id)
    res.status(204).send()
  } catch (err) { next(err) }
})
