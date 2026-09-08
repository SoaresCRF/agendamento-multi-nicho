import { z } from 'zod'

const BIO_MAX_LENGTH = 280
// Base64 inflates size ~33%; this ceiling accepts a ~3MB decoded image, well
// above what the client's crop step ever produces, while still bounding the
// column against abuse via direct API calls that skip the client crop.
const MAX_PHOTO_DATA_URI_LENGTH = 4_000_000

const httpsPhotoUrl = z.string().url().startsWith('https://').max(2048)
const dataPhotoUri = z
  .string()
  .max(MAX_PHOTO_DATA_URI_LENGTH, 'Imagem excede o tamanho máximo permitido')
  .regex(/^data:image\/(png|jpe?g|webp);base64,/, 'Formato de imagem não suportado')

export const updateProfileSchema = z.object({
  profilePhotoUrl: z.union([httpsPhotoUrl, dataPhotoUri]).nullable().optional(),
  bio: z.string().max(BIO_MAX_LENGTH).nullable().optional(),
})
