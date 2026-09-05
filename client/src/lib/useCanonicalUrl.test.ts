import { renderHook, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { useCanonicalUrl } from './useCanonicalUrl'

describe('useCanonicalUrl', () => {
  afterEach(() => {
    cleanup()
    document.querySelectorAll('link[rel="canonical"]').forEach((el) => el.remove())
  })

  it('adds a canonical link tag with the given URL', () => {
    renderHook(() => useCanonicalUrl('https://agendamento.example.com/joana-psicologa'))
    const link = document.querySelector('link[rel="canonical"]')
    expect(link?.getAttribute('href')).toBe('https://agendamento.example.com/joana-psicologa')
  })

  it('reuses the existing tag instead of adding a second one when the URL changes', () => {
    const { rerender } = renderHook(({ href }) => useCanonicalUrl(href), {
      initialProps: { href: 'https://agendamento.example.com/joana-psicologa' },
    })
    rerender({ href: 'https://agendamento.example.com/carlos-personal' })

    const links = document.querySelectorAll('link[rel="canonical"]')
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('https://agendamento.example.com/carlos-personal')
  })
})
