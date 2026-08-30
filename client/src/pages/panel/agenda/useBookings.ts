import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { Booking } from '../../../lib/types'

export function useBookings(status?: 'CONFIRMED' | 'CANCELLED') {
  return useQuery({
    queryKey: ['bookings', { status }],
    queryFn: () => {
      const query = status ? `?status=${status}` : ''
      return api.get<Booking[]>(`/api/bookings${query}`)
    },
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch<Booking>(`/api/bookings/${id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  })
}
