export type FieldType = 'TEXT' | 'NUMBER' | 'SELECT' | 'TEXTAREA'

export interface ServiceTypeCustomField {
  id: string
  serviceTypeId: string
  label: string
  fieldType: FieldType
  required: boolean
  order: number
  options: string[] | null
}

export interface ServiceType {
  id: string
  userId: string
  name: string
  durationMinutes: number
  description: string | null
  requiresCustomForm: boolean
  createdAt: string
  updatedAt: string
  customFields: ServiceTypeCustomField[]
}

export interface ServiceTypeInput {
  name: string
  durationMinutes: number
  description?: string
  requiresCustomForm: boolean
  customFields: Array<{
    label: string
    fieldType: FieldType
    required: boolean
    order: number
    options?: string[]
  }>
}

export interface AvailabilityRule {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface BlockedSlot {
  id: string
  userId: string
  startsAt: string
  endsAt: string
  reason: string | null
}

export interface Booking {
  id: string
  userId: string
  serviceTypeId: string
  serviceType: ServiceType
  clientName: string
  clientEmail: string
  startsAt: string
  endsAt: string
  status: 'CONFIRMED' | 'CANCELLED'
  formResponses: Record<string, unknown> | null
  createdAt: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  slug: string
}

export interface MeResponse extends AuthUser {
  timezone: string
  niche: string | null
}

export interface PublicProfile {
  name: string
  niche: string | null
  timezone: string
}

export interface PublicServiceType {
  id: string
  name: string
  durationMinutes: number
  description: string | null
  requiresCustomForm: boolean
  customFields: ServiceTypeCustomField[]
}
