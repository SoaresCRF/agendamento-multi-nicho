import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, afterEach } from 'vitest'
import type { ReactNode } from 'react'
import { useBookings } from './useBookings'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useBookings', () => {
  afterEach(() => vi.restoreAllMocks())

  it('follows nextCursor and returns every booking across pages, not just the first', async () => {
    const pageOne = { items: [{ id: 'b1' }], nextCursor: 'b1' }
    const pageTwo = { items: [{ id: 'b2' }], nextCursor: null }
    const calls: string[] = []
    global.fetch = vi.fn().mockImplementation((url: string) => {
      calls.push(url)
      const body = url.includes('cursor=b1') ? pageTwo : pageOne
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
    }) as unknown as typeof fetch

    const { result } = renderHook(() => useBookings(), { wrapper })

    await waitFor(() => expect(result.current.data).toHaveLength(2))
    expect(result.current.data?.map((b) => b.id)).toEqual(['b1', 'b2'])
    expect(calls).toHaveLength(2)
  })

  it('requests the largest page size the server allows, to minimize round-trips', async () => {
    const calls: string[] = []
    global.fetch = vi.fn().mockImplementation((url: string) => {
      calls.push(url)
      return Promise.resolve(new Response(JSON.stringify({ items: [], nextCursor: null }), { status: 200 }))
    }) as unknown as typeof fetch

    const { result } = renderHook(() => useBookings(), { wrapper })

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(calls[0]).toMatch(/limit=200/)
  })
})
