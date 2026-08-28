import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen'),
  timezone: z.string().min(1),
  niche: z.string().optional(),
})
