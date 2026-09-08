import type { RequestHandler } from 'express'
import { verifyAccessToken } from '../lib/jwt'
import { logger } from '../lib/logger'

const BEARER_PREFIX = 'Bearer '

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith(BEARER_PREFIX)) {
    logger.warn('Auth rejected: missing bearer token', { path: req.path })
    res.status(401).json({ error: 'Não autenticado' })
    return
  }
  // Never log the token itself — only that one was presented and rejected.
  const payload = verifyAccessToken(header.slice(BEARER_PREFIX.length))
  if (!payload) {
    logger.warn('Auth rejected: invalid or expired token', { path: req.path })
    res.status(401).json({ error: 'Não autenticado' })
    return
  }
  req.userId = payload.userId
  next()
}
