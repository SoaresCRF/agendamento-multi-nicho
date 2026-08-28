import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { env } from './lib/env'
import { errorHandler } from './middleware/errorHandler'

export function createApp() {
  const app = express()
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }))
  app.use(express.json())
  app.use(cookieParser())

  app.get('/health', (_req, res) => res.json({ ok: true }))

  // Later tasks mount feature routers here, e.g.:
  // app.use('/api/auth', authRouter)

  app.use(errorHandler)
  return app
}
