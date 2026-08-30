import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { PublicProfile, PublicServiceType } from '../../lib/types'

export function usePublicProfile(slug: string) {
  return useQuery({ queryKey: ['public', slug, 'profile'], queryFn: () => api.get<PublicProfile>(`/api/public/${slug}`) })
}

export function usePublicServiceTypes(slug: string) {
  return useQuery({
    queryKey: ['public', slug, 'service-types'],
    queryFn: () => api.get<PublicServiceType[]>(`/api/public/${slug}/service-types`),
  })
}

export function usePublicSlots(slug: string, serviceTypeId: string | null, date: string) {
  return useQuery({
    queryKey: ['public', slug, 'slots', serviceTypeId, date],
    queryFn: async () => {
      const result = await api.get<{ slots: string[] }>(
        `/api/public/${slug}/service-types/${serviceTypeId}/slots?date=${date}`
      )
      return result.slots
    },
    enabled: serviceTypeId !== null,
  })
}

export interface CreateBookingInput {
  serviceTypeId: string
  startsAt: string
  clientName: string
  clientEmail: string
  formResponses?: Record<string, unknown>
}

export interface CreateBookingResult {
  id: string
  startsAt: string
  endsAt: string
  status: string
}

export function useCreateBooking(slug: string) {
  return useMutation({
    mutationFn: (input: CreateBookingInput) => api.post<CreateBookingResult>(`/api/public/${slug}/bookings`, input),
  })
}
