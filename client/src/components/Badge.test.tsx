import { describe, it, expect } from 'vitest'
import { toneForNiche } from './Badge'

describe('toneForNiche', () => {
  it('is deterministic for the same niche', () => {
    expect(toneForNiche('Psicologia')).toBe(toneForNiche('Psicologia'))
  })

  it('picks one of the three decorative accent tones', () => {
    for (const niche of ['Psicologia', 'Personal Trainer', 'Estética', 'Nutrição']) {
      expect(['accent-teal', 'accent-terracotta', 'accent-lilac']).toContain(toneForNiche(niche))
    }
  })
})
