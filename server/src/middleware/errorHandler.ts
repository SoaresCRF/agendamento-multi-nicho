import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../lib/errors'
import { logger } from '../lib/logger'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Dados inválidos', details: err.flatten() })
    return
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  if (err instanceof Error && 'type' in err && err.type === 'entity.too.large') {
    res.status(413).json({ error: 'Corpo da requisição excede o tamanho máximo permitido' })
    return
  }
  logger.error('Unhandled error', {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  })
  res.status(500).json({ error: 'Erro interno do servidor' })
}
