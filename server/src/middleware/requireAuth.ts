import type { RequestHandler } from 'express'
import { verifyAccessToken } from '../lib/jwt'

const BEARER_PREFIX = 'Bearer '

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith(BEARER_PREFIX)) {
    res.status(401).json({ error: 'Não autenticado' })
    return
  }
  const payload = verifyAccessToken(header.slice(BEARER_PREFIX.length))
  if (!payload) {
    res.status(401).json({ error: 'Não autenticado' })
    return
  }
  req.userId = payload.userId
  next()
}
