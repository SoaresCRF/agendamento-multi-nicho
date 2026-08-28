import { z } from 'zod'

export const customFieldSchema = z.object({
  label: z.string().min(1),
  fieldType: z.enum(['TEXT', 'NUMBER', 'SELECT', 'TEXTAREA']),
  required: z.boolean(),
  order: z.number().int().nonnegative(),
  options: z.array(z.string()).optional(),
})

export const serviceTypeInputSchema = z.object({
  name: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  description: z.string().optional(),
  requiresCustomForm: z.boolean().default(false),
  customFields: z.array(customFieldSchema).default([]),
})
