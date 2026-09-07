import { z } from 'zod'

const BIO_MAX_LENGTH = 280

export const updateProfileSchema = z.object({
  profilePhotoUrl: z.string().url().startsWith('https://').max(2048).nullable().optional(),
  bio: z.string().max(BIO_MAX_LENGTH).nullable().optional(),
})
