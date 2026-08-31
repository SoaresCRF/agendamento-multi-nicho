import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api, ApiError, setAccessToken, getAccessToken, setOnAuthFailure } from './api'

const originalFetch = global.fetch

describe('api client', () => {
  beforeEach(() => {
    setAccessToken(null)
  })
  afterEach(() => {
    global.fetch = originalFetch
    setOnAuthFailure(null)
    vi.restoreAllMocks()
  })

  it('sends the Authorization header when a token is set', async () => {
    setAccessToken('abc123')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )
    global.fetch = fetchMock as unknown as typeof fetch

    await api.get('/api/me')

    const [, options] = fetchMock.mock.calls[0]
    const headers = options.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer abc123')
    expect(options.credentials).toBe('include')
  })

  it('throws ApiError with the server message on a non-2xx response', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401 })
    ) as unknown as typeof fetch

    await expect(api.get('/api/me')).rejects.toMatchObject(
      new ApiError(401, 'Não autenticado')
    )
  })

  it('retries once via /auth/refresh on a 401, then succeeds with the new token', async () => {
    let call = 0
    global.fetch = vi.fn().mockImplementation((url: string) => {
      call++
      if (typeof url === 'string' && url.endsWith('/api/me') && call === 1) {
        return Promise.resolve(new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401 }))
      }
      if (typeof url === 'string' && url.endsWith('/api/auth/refresh')) {
        return Promise.resolve(new Response(JSON.stringify({ accessToken: 'new-token' }), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify({ id: '1' }), { status: 200 }))
    }) as unknown as typeof fetch

    const result = await api.get('/api/me')

    expect(result).toEqual({ id: '1' })
    expect(getAccessToken()).toBe('new-token')
  })

  it('does not retry a second time when refresh itself fails', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.endsWith('/api/auth/refresh')) {
        return Promise.resolve(new Response(JSON.stringify({ error: 'Sessão inválida' }), { status: 401 }))
      }
      return Promise.resolve(new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401 }))
    }) as unknown as typeof fetch

    await expect(api.get('/api/me')).rejects.toMatchObject({ status: 401 })
  })

  it('notifies the registered onAuthFailure callback exactly once when refresh fails, and still throws the original 401', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.endsWith('/api/auth/refresh')) {
        return Promise.resolve(new Response(JSON.stringify({ error: 'Sessão inválida' }), { status: 401 }))
      }
      return Promise.resolve(new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401 }))
    }) as unknown as typeof fetch

    const onAuthFailure = vi.fn()
    setOnAuthFailure(onAuthFailure)

    await expect(api.get('/api/me')).rejects.toMatchObject({ status: 401 })

    expect(onAuthFailure).toHaveBeenCalledTimes(1)
  })

  it('shares a single in-flight refresh across concurrent 401s, and still refreshes again on a later cycle', async () => {
    let refreshCalls = 0
    let validToken = ''

    global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (typeof url === 'string' && url.endsWith('/api/auth/refresh')) {
        refreshCalls++
        validToken = `token-${refreshCalls}`
        return Promise.resolve(new Response(JSON.stringify({ accessToken: validToken }), { status: 200 }))
      }
      const headers = new Headers(options?.headers)
      if (validToken !== '' && headers.get('Authorization') === `Bearer ${validToken}`) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401 }))
    }) as unknown as typeof fetch

    // Two queries mount together and both fire with a stale/absent access token,
    // so both independently hit a 401 at roughly the same time.
    const [bookings, me] = await Promise.all([api.get('/api/bookings'), api.get('/api/me')])

    expect(bookings).toEqual({ ok: true })
    expect(me).toEqual({ ok: true })
    expect(refreshCalls).toBe(1)

    // A later, genuinely separate refresh cycle (e.g. the access token expires
    // again after the first cycle fully settled) must still fire a fresh request -
    // the guard must not be permanently wedged to "only ever refreshes once".
    setAccessToken('stale-token')
    const again = await api.get('/api/me')

    expect(again).toEqual({ ok: true })
    expect(refreshCalls).toBe(2)
  })
})
