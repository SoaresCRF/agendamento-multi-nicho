import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { AuthProvider, useAuth } from './auth-context'
import { api, getAccessToken } from './api'

const originalFetch = global.fetch

function Consumer() {
  const { user, accessToken, isLoading } = useAuth()
  if (isLoading) return <div>carregando</div>
  return (
    <div>
      {user ? `logado: ${user.name}` : 'deslogado'} / token: {accessToken ?? 'none'}
    </div>
  )
}

describe('AuthProvider', () => {
  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('bootstraps a session from the refresh cookie on mount', async () => {
    // The first /api/me call has no access token yet, so it must 401 to trigger
    // api.ts's transparent refresh-and-retry; only afterwards does /api/me succeed.
    let meCallCount = 0
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.endsWith('/api/auth/refresh')) {
        return Promise.resolve(new Response(JSON.stringify({ accessToken: 'tok' }), { status: 200 }))
      }
      if (typeof url === 'string' && url.endsWith('/api/me')) {
        meCallCount += 1
        if (meCallCount === 1) {
          return Promise.resolve(new Response('{}', { status: 401 }))
        }
        return Promise.resolve(
          new Response(JSON.stringify({ id: '1', name: 'Joana', email: 'j@x.com', slug: 'joana' }), { status: 200 }),
        )
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    }) as unknown as typeof fetch

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    expect(screen.getByText('carregando')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/logado: Joana/)).toBeInTheDocument())
    expect(getAccessToken()).toBe('tok')
  })

  it('ends up logged out when the refresh cookie is absent/invalid, without logging (expected case)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 401 })) as unknown as typeof fetch

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByText(/deslogado/)).toBeInTheDocument())
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('logs an unexpected (non-401) silent-refresh failure instead of swallowing it', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 500 })) as unknown as typeof fetch

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByText(/deslogado/)).toBeInTheDocument())
    expect(consoleError).toHaveBeenCalledWith('Silent session refresh failed unexpectedly:', expect.anything())
  })

  it('clears the session when a later authenticated request finds the refresh token dead', async () => {
    let meCallCount = 0
    let refreshCallCount = 0
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.endsWith('/api/auth/refresh')) {
        refreshCallCount += 1
        if (refreshCallCount === 1) {
          return Promise.resolve(new Response(JSON.stringify({ accessToken: 'tok' }), { status: 200 }))
        }
        // Second refresh (triggered by the later request below) is the dead session.
        return Promise.resolve(new Response(JSON.stringify({ error: 'Sessão inválida' }), { status: 401 }))
      }
      if (typeof url === 'string' && url.endsWith('/api/me')) {
        meCallCount += 1
        // Call 1: bootstrap's initial 401 that triggers the refresh-and-retry.
        // Call 2: that retry, succeeding — its response is used directly as the profile.
        if (meCallCount === 1) return Promise.resolve(new Response('{}', { status: 401 }))
        if (meCallCount === 2) {
          return Promise.resolve(
            new Response(JSON.stringify({ id: '1', name: 'Joana', email: 'j@x.com', slug: 'joana' }), { status: 200 }),
          )
        }
        // Call 3+: something in the panel calls /api/me again after the session died.
        return Promise.resolve(new Response('{}', { status: 401 }))
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    }) as unknown as typeof fetch

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByText(/logado: Joana/)).toBeInTheDocument())

    // Simulate a later query/mutation in the panel whose refresh attempt fails
    // because the refresh token itself is now expired/revoked.
    await expect(api.get('/api/me')).rejects.toThrow()

    await waitFor(() => expect(screen.getByText(/deslogado/)).toBeInTheDocument())
    expect(screen.getByText(/token: none/)).toBeInTheDocument()
  })
})
