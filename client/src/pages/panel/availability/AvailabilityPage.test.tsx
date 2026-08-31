import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { AvailabilityPage } from './AvailabilityPage'
import { ToastProvider } from '../../../components/toast/ToastProvider'
import type { AvailabilityRule } from '../../../lib/types'

function renderPage(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AvailabilityPage />
      </ToastProvider>
    </QueryClientProvider>
  )
}

describe('AvailabilityPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('does not let a background refetch clobber an in-progress edit', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }]), { status: 200 })
    ) as unknown as typeof fetch

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderPage(queryClient)

    // The checkbox exists in the DOM regardless of data (all days always render),
    // so wait for its checked state rather than just its presence.
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Segunda-feira' })).toBeChecked())

    // User edit: turn Tuesday on too, before saving.
    await userEvent.click(screen.getByRole('checkbox', { name: 'Terça-feira' }))
    expect(screen.getByRole('checkbox', { name: 'Terça-feira' })).toBeChecked()

    // Simulate a background refetch (e.g. window refocus after staleTime elapses)
    // resolving to a different server state — Wednesday only, no Monday/Tuesday.
    // Writing straight into the cache (as TanStack Query does when a real
    // background refetch resolves) sidesteps racing the component's effect
    // against an unrelated mocked-fetch timing chain. The macrotask tick lets
    // TanStack Query's batched subscriber notification (and any resulting
    // effect/render) actually flush before we assert.
    const refetched: AvailabilityRule[] = [{ dayOfWeek: 3, startTime: '09:00', endTime: '18:00' }]
    await act(async () => {
      queryClient.setQueryData(['availability'], refetched)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // The unsaved edit must survive; the new server data must not silently
    // replace it.
    expect(screen.getByRole('checkbox', { name: 'Segunda-feira' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Terça-feira' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Quarta-feira' })).not.toBeChecked()
  })
})
