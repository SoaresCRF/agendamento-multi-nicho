// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const NEXT_SENTINEL = Symbol('next')
const nextMock = vi.fn(() => NEXT_SENTINEL)

vi.mock('@vercel/functions', () => ({ next: () => nextMock() }))

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const GOOGLEBOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'

function makeRequest(path: string, userAgent: string): Request {
  return new Request(`https://agendamento.example.com${path}`, { headers: { 'user-agent': userAgent } })
}

describe('bot-only dynamic rendering middleware', () => {
  beforeEach(() => {
    vi.stubEnv('API_URL', 'https://api.example.com')
    nextMock.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('lets a regular browser through untouched', async () => {
    const { default: middleware } = await import('./middleware')
    const result = await middleware(makeRequest('/joana-psicologa', BROWSER_UA))
    expect(result).toBe(NEXT_SENTINEL)
  })

  it('serves a prerendered page with title, description and Open Graph tags to a bot', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ name: 'Joana Silva', niche: 'Psicologia' }), { status: 200 })),
    )
    const { default: middleware } = await import('./middleware')

    const res = await middleware(makeRequest('/joana-psicologa', GOOGLEBOT_UA))

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/html/)
    const body = await res.text()
    expect(body).toContain('<title>Joana Silva · Agendamento</title>')
    expect(body).toContain('name="description" content="Agende um horário com Joana Silva — Psicologia')
    expect(body).toContain('property="og:title" content="Joana Silva · Agendamento"')
    expect(body).toContain('<h1>Joana Silva</h1>')
  })

  it('sets a canonical URL stripped of query params, even when the request has tracking params', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ name: 'Joana Silva', niche: null }), { status: 200 })),
    )
    const { default: middleware } = await import('./middleware')

    const res = await middleware(makeRequest('/joana-psicologa?utm_source=whatsapp', GOOGLEBOT_UA))
    const body = await res.text()

    expect(body).toContain('<link rel="canonical" href="https://agendamento.example.com/joana-psicologa" />')
    expect(body).toContain('property="og:url" content="https://agendamento.example.com/joana-psicologa"')
  })

  it('escapes HTML in the professional name to prevent stored XSS in the crawler-facing page', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ name: '<script>alert(1)</script>', niche: null }), { status: 200 }),
        ),
    )
    const { default: middleware } = await import('./middleware')

    const res = await middleware(makeRequest('/malicious-slug', GOOGLEBOT_UA))
    const body = await res.text()

    expect(body).not.toContain('<script>alert(1)</script>')
    expect(body).toContain('&lt;script&gt;')
  })

  it('returns a real 404 status for a bot hitting an unknown slug', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })))
    const { default: middleware } = await import('./middleware')

    const res = await middleware(makeRequest('/does-not-exist', GOOGLEBOT_UA))

    expect(res.status).toBe(404)
  })

  it('falls back to next() for a bot when the backend is unreachable, instead of breaking the page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const { default: middleware } = await import('./middleware')

    const result = await middleware(makeRequest('/joana-psicologa', GOOGLEBOT_UA))

    expect(result).toBe(NEXT_SENTINEL)
  })

  it('does not intercept multi-segment paths (only single-segment /:slug is a profile page)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { default: middleware } = await import('./middleware')

    const result = await middleware(makeRequest('/joana-psicologa/algo', GOOGLEBOT_UA))

    expect(result).toBe(NEXT_SENTINEL)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['/site.webmanifest', '/apple-touch-icon.png', '/robots.txt', '/favicon.ico'])(
    'does not treat the static file %s as a profile slug, even for a bot',
    async (path) => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      const { default: middleware } = await import('./middleware')

      const result = await middleware(makeRequest(path, GOOGLEBOT_UA))

      expect(result).toBe(NEXT_SENTINEL)
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )
})

describe('dynamic sitemap.xml', () => {
  beforeEach(() => {
    vi.stubEnv('API_URL', 'https://api.example.com')
    nextMock.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('serves every professional slug as a sitemap URL for any visitor, not just bots', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            { slug: 'joana-psicologa', updatedAt: '2026-09-01T00:00:00.000Z' },
            { slug: 'carlos-personal', updatedAt: '2026-09-02T00:00:00.000Z' },
          ]),
          { status: 200 },
        ),
      ),
    )
    const { default: middleware } = await import('./middleware')

    const res = await middleware(makeRequest('/sitemap.xml', BROWSER_UA))

    expect(res.headers.get('content-type')).toMatch(/application\/xml/)
    const body = await res.text()
    expect(body).toContain('<loc>https://agendamento.example.com/joana-psicologa</loc>')
    expect(body).toContain('<loc>https://agendamento.example.com/carlos-personal</loc>')
    expect(body).toContain('<lastmod>2026-09-01</lastmod>')
  })

  it('escapes each slug before writing it into the XML, as defense-in-depth', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify([{ slug: '"><script>alert(1)</script>', updatedAt: '2026-09-01T00:00:00.000Z' }]),
            { status: 200 },
          ),
        ),
    )
    const { default: middleware } = await import('./middleware')

    const res = await middleware(makeRequest('/sitemap.xml', BROWSER_UA))
    const body = await res.text()

    expect(body).not.toContain('<script>alert(1)</script>')
    expect(body).toContain('&lt;script&gt;')
  })

  it('falls back to next() when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const { default: middleware } = await import('./middleware')

    const result = await middleware(makeRequest('/sitemap.xml', BROWSER_UA))

    expect(result).toBe(NEXT_SENTINEL)
  })
})
