import { Router, type Request, type Response, type NextFunction } from 'express'
import { requireAuth } from '../../middleware/requireAuth'
import { availabilityListSchema } from './availability.schemas'
import * as service from './rules.service'

// mergeParams: true exposes the parent path's :id here, but Express's route-string
// type inference only looks at this router's own '/' path — annotate req explicitly
// so req.params.id typechecks.
type Params = { id: string }

export const serviceTypeRulesRouter = Router({ mergeParams: true })
serviceTypeRulesRouter.use(requireAuth)

serviceTypeRulesRouter.get('/', async (req: Request<Params>, res: Response, next: NextFunction) => {
  try {
    res.json(await service.getServiceTypeRules(req.userId!, req.params.id))
  } catch (err) { next(err) }
})

serviceTypeRulesRouter.put('/', async (req: Request<Params>, res: Response, next: NextFunction) => {
  try {
    const rules = availabilityListSchema.parse(req.body)
    res.json(await service.replaceServiceTypeRules(req.userId!, req.params.id, rules))
  } catch (err) { next(err) }
})
