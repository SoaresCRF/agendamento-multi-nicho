import express from 'express'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './lib/env'
import { errorHandler } from './middleware/errorHandler'
import { authRouter } from './modules/auth/auth.routes'
import { usersRouter } from './modules/users/users.routes'
import { serviceTypesRouter } from './modules/service-types/service-types.routes'
import { availabilityRouter } from './modules/availability/availability.routes'
import { serviceTypeRulesRouter } from './modules/availability/rules.routes'
import { blockedSlotsRouter } from './modules/blocked-slots/blocked-slots.routes'
import { publicRouter } from './modules/public/public.routes'
import { bookingsRouter } from './modules/bookings/bookings.routes'

export function createApp() {
  const app = express()
  // Render (and Railway) put exactly one reverse proxy in front of the app. Without
  // this, Express ignores X-Forwarded-For and req.ip resolves to the proxy's own
  // address — express-rate-limit would then bucket every visitor together (or, on
  // v8+, throw when it sees a forwarded header it wasn't told to trust).
  // TODO(post-deploy): unverified against the actual chosen platform/topology —
  // see "Checklist pós-deploy" in README.md before going live.
  app.set('trust proxy', 1)
  // crossOriginResourcePolicy defaults to 'same-origin', which blocks the browser from
  // reading responses even when CORS allows it — this API is deliberately served
  // cross-origin to a separate frontend (env.CLIENT_ORIGIN), so relax it to match.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(compression())
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
  app.use('/api/bookings', bookingsRouter)

  app.use(errorHandler)
  return app
}
