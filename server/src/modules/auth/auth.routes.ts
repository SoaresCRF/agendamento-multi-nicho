import { Router } from 'express'
import { registerSchema, loginSchema } from './auth.schemas'
import { registerUser, loginUser } from './auth.service'

export const authRouter = Router()

export const REFRESH_COOKIE = 'refreshToken'
export const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body)
    const result = await registerUser(input)
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions)
    res.status(201).json({ user: result.user, accessToken: result.accessToken })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const result = await loginUser(email, password)
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions)
    res.json({ user: result.user, accessToken: result.accessToken })
  } catch (err) {
    next(err)
  }
})
