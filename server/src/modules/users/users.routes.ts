import { Router } from 'express'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../middleware/requireAuth'
import { updateProfileSchema } from './users.schemas'

export const usersRouter = Router()

usersRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } })
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      slug: user.slug,
      timezone: user.timezone,
      niche: user.niche,
      profilePhotoUrl: user.profilePhotoUrl,
      bio: user.bio,
    })
  } catch (err) {
    next(err)
  }
})

usersRouter.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const input = updateProfileSchema.parse(req.body)
    const user = await prisma.user.update({ where: { id: req.userId }, data: input })
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      slug: user.slug,
      timezone: user.timezone,
      niche: user.niche,
      profilePhotoUrl: user.profilePhotoUrl,
      bio: user.bio,
    })
  } catch (err) {
    next(err)
  }
})
