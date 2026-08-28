import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { env } from './lib/env'
import { errorHandler } from './middleware/errorHandler'
import { authRouter } from './modules/auth/auth.routes'
import { usersRouter } from './modules/users/users.routes'
import { serviceTypesRouter } from './modules/service-types/service-types.routes'

export function createApp() {
  const app = express()
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }))
  app.use(express.json())
  app.use(cookieParser())

  app.get('/health', (_req, res) => res.json({ ok: true }))

  app.use('/api/auth', authRouter)
  app.use('/api', usersRouter)
  app.use('/api/service-types', serviceTypesRouter)

  app.use(errorHandler)
  return app
}
