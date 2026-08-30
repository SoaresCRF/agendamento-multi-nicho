import { useQuery } from '@tanstack/react-query'
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
