import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import type { MeResponse } from './types'

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => api.get<MeResponse>('/api/me') })
}
