import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { App } from './App'

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.history.pushState({}, '', '/')
  })

  it('redirects to /login by default and shows the login placeholder', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 401 })) as unknown as typeof fetch
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('shows a not-found message for an unmatched top-level path', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 401 })) as unknown as typeof fetch
    window.history.pushState({}, '', '/algo/inexistente')
    render(<App />)
    expect(await screen.findByText('Página não encontrada')).toBeInTheDocument()
  })

  it('shows a not-found message inside the panel shell for an unmatched /painel/* path', async () => {
    let meCallCount = 0
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.endsWith('/api/auth/refresh')) {
        return Promise.resolve(new Response(JSON.stringify({ accessToken: 'tok' }), { status: 200 }))
      }
      if (typeof url === 'string' && url.endsWith('/api/me')) {
        meCallCount += 1
        if (meCallCount === 1) return Promise.resolve(new Response('{}', { status: 401 }))
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: '1',
              name: 'Joana',
              email: 'j@x.com',
              slug: 'joana',
              timezone: 'America/Sao_Paulo',
              niche: null,
            }),
            { status: 200 },
          ),
        )
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    }) as unknown as typeof fetch
    window.history.pushState({}, '', '/painel/rota-que-nao-existe')

    render(<App />)

    expect(await screen.findByText('Página não encontrada')).toBeInTheDocument()
    expect(screen.getByText('Agenda')).toBeInTheDocument()
  })
})
