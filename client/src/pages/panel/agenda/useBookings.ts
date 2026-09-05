import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { Booking } from '../../../lib/types'

interface BookingsPage {
  items: Booking[]
  nextCursor: string | null
}

// GET /api/bookings is paginated server-side (server/src/modules/bookings/bookings.routes.ts)
// so a professional with years of history doesn't force one huge query/response. The Agenda
// screen has no "load more" UI yet, so fetch every page here and hand back the flat list —
// pages are necessarily sequential (each cursor depends on the previous response), so request
// the server's max page size to keep this to one round-trip for any realistic history.
const MAX_PAGE_SIZE = 200 // must match MAX_PAGE_SIZE in server/src/modules/bookings/bookings.routes.ts

async function fetchAllBookings(status?: 'CONFIRMED' | 'CANCELLED'): Promise<Booking[]> {
  const items: Booking[] = []
  let cursor: string | undefined
  do {
    const params = new URLSearchParams()
    params.set('limit', String(MAX_PAGE_SIZE))
    if (status) params.set('status', status)
    if (cursor) params.set('cursor', cursor)
    const page = await api.get<BookingsPage>(`/api/bookings?${params.toString()}`)
    items.push(...page.items)
    cursor = page.nextCursor ?? undefined
  } while (cursor)
  return items
}

export function useBookings(status?: 'CONFIRMED' | 'CANCELLED') {
  return useQuery({
    queryKey: ['bookings', { status }],
    queryFn: () => fetchAllBookings(status),
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch<Booking>(`/api/bookings/${id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  })
}
