import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../middleware/requireAuth'

export const usersRouter = Router()

usersRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } })
    res.json({ id: user.id, name: user.name, email: user.email, slug: user.slug, timezone: user.timezone, niche: user.niche })
  } catch (err) {
    next(err)
  }
})
