import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api, ApiError, setAccessToken, getAccessToken } from './api'

const originalFetch = global.fetch

describe('api client', () => {
  beforeEach(() => {
    setAccessToken(null)
  })
  afterEach(() => {
    global.fetch = originalFetch
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
})
