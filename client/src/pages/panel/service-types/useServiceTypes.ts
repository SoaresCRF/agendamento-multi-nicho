import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { ServiceType, ServiceTypeInput } from '../../../lib/types'

const KEY = ['service-types'] as const

export function useServiceTypes() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get<ServiceType[]>('/api/service-types') })
}

export function useCreateServiceType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ServiceTypeInput) => api.post<ServiceType>('/api/service-types', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateServiceType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ServiceTypeInput }) =>
      api.patch<ServiceType>(`/api/service-types/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteServiceType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/service-types/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
