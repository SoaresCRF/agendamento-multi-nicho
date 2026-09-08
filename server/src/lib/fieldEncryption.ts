import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto'
import { env } from './env'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

// Derives a fixed 32-byte AES key from the configured secret — same "32+ random
// characters" ergonomics as JWT_SECRET, no separate base64-key format to get wrong.
const key = createHash('sha256').update(env.FORM_RESPONSES_ENCRYPTION_KEY).digest()

// Used for Booking.formResponses (server/prisma/schema.prisma) — custom intake fields
// can carry health-adjacent answers, so this stays encrypted at rest, not plain JSON.
export function encryptJson(value: unknown): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv, authTag, ciphertext].map((b) => b.toString('base64')).join('.')
}

export function decryptJson<T = unknown>(encrypted: string): T {
  const [ivB64, authTagB64, ciphertextB64] = encrypted.split('.')
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()])
  return JSON.parse(plaintext.toString('utf8')) as T
}
