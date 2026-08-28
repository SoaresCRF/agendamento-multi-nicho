import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { env } from './lib/env'
import { errorHandler } from './middleware/errorHandler'
import { authRouter } from './modules/auth/auth.routes'
import { usersRouter } from './modules/users/users.routes'
import { serviceTypesRouter } from './modules/service-types/service-types.routes'
import { availabilityRouter } from './modules/availability/availability.routes'
import { serviceTypeRulesRouter } from './modules/availability/rules.routes'
import { blockedSlotsRouter } from './modules/blocked-slots/blocked-slots.routes'
import { publicRouter } from './modules/public/public.routes'

export function createApp() {
  const app = express()
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }))
  app.use(express.json())
  app.use(cookieParser())

  app.get('/health', (_req, res) => res.json({ ok: true }))

  app.use('/api/auth', authRouter)
  app.use('/api', usersRouter)
  app.use('/api/service-types', serviceTypesRouter)
  app.use('/api/availability', availabilityRouter)
  app.use('/api/service-types/:id/availability-rules', serviceTypeRulesRouter)
  app.use('/api/blocked-slots', blockedSlotsRouter)
  app.use('/api/public', publicRouter)

  app.use(errorHandler)
  return app
}
