import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { AuthProvider, useAuth } from './auth-context'
import { getAccessToken } from './api'

const originalFetch = global.fetch

function Consumer() {
  const { user, accessToken, isLoading } = useAuth()
  if (isLoading) return <div>carregando</div>
  return <div>{user ? `logado: ${user.name}` : 'deslogado'} / token: {accessToken ?? 'none'}</div>
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
          new Response(JSON.stringify({ id: '1', name: 'Joana', email: 'j@x.com', slug: 'joana' }), { status: 200 })
        )
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    }) as unknown as typeof fetch

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )

    expect(screen.getByText('carregando')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/logado: Joana/)).toBeInTheDocument())
    expect(getAccessToken()).toBe('tok')
  })

  it('ends up logged out when the refresh cookie is absent/invalid', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 401 })) as unknown as typeof fetch

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByText(/deslogado/)).toBeInTheDocument())
  })
})
