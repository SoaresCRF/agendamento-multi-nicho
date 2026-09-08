import { describe, it, expect } from 'vitest'
import { encryptJson, decryptJson } from './fieldEncryption'

describe('fieldEncryption', () => {
  it('round-trips an object through encryption and decryption', () => {
    const value = { queixaPrincipal: 'Ansiedade', emUsoDeMedicacao: 'Sim' }
    expect(decryptJson(encryptJson(value))).toEqual(value)
  })

  it('never stores the plaintext value inside the ciphertext', () => {
    const encrypted = encryptJson({ label: 'Está em uso de medicação?', value: 'Sim' })
    expect(encrypted).not.toContain('medicação')
    expect(encrypted).not.toContain('Sim')
  })

  it('produces a different ciphertext each time for the same input, since the IV is random', () => {
    const value = { a: 1 }
    expect(encryptJson(value)).not.toBe(encryptJson(value))
  })

  it('fails closed on a tampered ciphertext instead of silently returning wrong data', () => {
    const encrypted = encryptJson({ a: 1 })
    const [iv, authTag, ciphertext] = encrypted.split('.')
    const tampered = [iv, authTag, ciphertext.slice(0, -4) + 'AAAA'].join('.')
    expect(() => decryptJson(tampered)).toThrow()
  })
})
