import { Router } from 'express'
import { env } from '../../lib/env'
import { strictLimiter } from '../../middleware/rateLimit'
import { requireSameOrigin } from '../../middleware/requireSameOrigin'
import { registerSchema, loginSchema, requestPasswordResetSchema, resetPasswordSchema } from './auth.schemas'
import {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  requestPasswordReset,
  resetPassword,
} from './auth.service'

export const authRouter = Router()

export const REFRESH_COOKIE = 'refreshToken'
// Frontend (Vercel) and backend (Render) are deployed on different domains, making
// every refresh request cross-site — SameSite=Lax would silently drop the cookie on
// that fetch, so this needs 'none' (which requires secure:true, already tied below).
export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

authRouter.post('/register', strictLimiter, async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body)
    const result = await registerUser(input)
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions)
    res.status(201).json({ user: result.user, accessToken: result.accessToken })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/login', strictLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const result = await loginUser(email, password)
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions)
    res.json({ user: result.user, accessToken: result.accessToken })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/refresh', requireSameOrigin, async (req, res, next) => {
  try {
    const token = req.cookies[REFRESH_COOKIE]
    if (!token) {
      res.status(401).json({ error: 'Sessão inválida, faça login novamente' })
      return
    }
    const result = await refreshSession(token)
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions)
    res.json({ user: result.user, accessToken: result.accessToken })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/logout', requireSameOrigin, async (req, res, next) => {
  try {
    const token = req.cookies[REFRESH_COOKIE]
    if (token) await logoutUser(token)
    res.clearCookie(REFRESH_COOKIE)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

authRouter.post('/forgot-password', strictLimiter, async (req, res, next) => {
  try {
    const { email } = requestPasswordResetSchema.parse(req.body)
    await requestPasswordReset(email)
    res.json({ message: 'Se o e-mail existir, enviamos um link de redefinição de senha.' })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/reset-password', strictLimiter, async (req, res, next) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body)
    await resetPassword(token, password)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})
