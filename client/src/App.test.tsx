import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { App } from './App'

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('redirects to /login by default and shows the login placeholder', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 401 })) as unknown as typeof fetch
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })
})
