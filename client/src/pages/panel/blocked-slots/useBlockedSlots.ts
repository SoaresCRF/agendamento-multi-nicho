import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { BlockedSlot } from '../../../lib/types'

const KEY = ['blocked-slots'] as const

export function useBlockedSlots() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get<BlockedSlot[]>('/api/blocked-slots') })
}

export function useCreateBlockedSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { startsAt: string; endsAt: string; reason?: string }) =>
      api.post<BlockedSlot>('/api/blocked-slots', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteBlockedSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/blocked-slots/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
