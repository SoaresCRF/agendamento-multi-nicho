import type { RequestHandler } from 'express'
import { env } from '../lib/env'

// Defense-in-depth against CSRF: the refresh cookie must use SameSite=None because
// the frontend (Vercel) and backend (Render) live on different domains, which
// removes the browser's own cross-site protection for cookie-carrying requests.
// Browsers always send Origin on state-changing (POST/PUT/DELETE/...) requests —
// reject anything that isn't the known frontend. An absent Origin (non-browser
// clients, older browsers) is allowed through rather than broken.
export const requireSameOrigin: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin
  if (origin && origin !== env.CLIENT_ORIGIN) {
    res.status(403).json({ error: 'Origem não permitida' })
    return
  }
  next()
}
