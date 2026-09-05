import { useEffect } from 'react'

// Defense-in-depth alongside the canonical tag client/middleware.ts already sets
// for recognized bots — this covers any crawler whose user-agent slips past that
// pattern and renders the SPA directly.
export function useCanonicalUrl(href: string) {
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = href
  }, [href])
}
