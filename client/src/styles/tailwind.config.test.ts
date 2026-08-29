import { describe, it, expect } from 'vitest'
import tailwindConfig from '../../tailwind.config'

describe('tailwind.config.ts DESIGN.md token fidelity', () => {
  const colors = tailwindConfig.theme!.extend!.colors as Record<string, string>

  it('matches DESIGN.md color tokens exactly', () => {
    expect(colors.primary).toBe('#0075de')
    expect(colors['primary-active']).toBe('#005bab')
    expect(colors['primary-soft']).toBe('#e6f2fb')
    expect(colors['secondary-dark']).toBe('#213183')
    expect(colors.canvas).toBe('#f6f5f4')
    expect(colors.surface).toBe('#ffffff')
    expect(colors.error).toBe('#e35d52')
    expect(colors['accent-teal']).toBe('#2a9d99')
    expect(colors['accent-terracotta']).toBe('#dd5b00')
    expect(colors['accent-lilac']).toBe('#d6b6f6')
  })

  it('matches DESIGN.md border-radius tokens', () => {
    const radius = tailwindConfig.theme!.extend!.borderRadius as Record<string, string>
    expect(radius.md).toBe('8px')
    expect(radius.lg).toBe('12px')
    expect(radius.pill).toBe('9999px')
  })

  it('matches DESIGN.md spacing tokens', () => {
    const spacing = tailwindConfig.theme!.extend!.spacing as Record<string, string>
    expect(spacing.lg).toBe('24px')
    expect(spacing.section).toBe('80px')
  })

  it('sets Lora as the display font and Inter as the sans font', () => {
    const fontFamily = tailwindConfig.theme!.extend!.fontFamily as Record<string, string[]>
    expect(fontFamily.display[0]).toBe('Lora')
    expect(fontFamily.sans[0]).toBe('Inter')
  })
})
