import { rateLimit, MINUTE } from 'express-rate-limit'
import { env } from '../lib/env'

// Limiters are module-level singletons (one shared counter per process, matching
// express-rate-limit's intended usage), so every test file sharing this process
// (vitest.config.ts runs files serially, not in isolated workers) would otherwise
// accumulate hits toward the same bucket across unrelated test files. Skip in tests;
// the library's own throttling behavior is verified in isolation by rateLimit.test.ts.
const skipInTests = () => env.NODE_ENV === 'test'

// Sensitive/state-changing public endpoints: login, register, booking creation.
// Tight enough to blunt brute-force/credential-stuffing and booking spam,
// loose enough not to lock out a legitimate user retrying a typo.
export const strictLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
})

// Public read-only browsing endpoints (profile/service-types/slots lookup).
// Generous, mainly to blunt scripted enumeration rather than normal usage.
export const publicReadLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
})
