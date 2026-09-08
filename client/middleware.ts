import { next } from '@vercel/functions'

// Regular visitors always get the normal SPA — this only intercepts the small
// set of user agents that read raw HTML instead of executing JavaScript
// (search crawlers, social-share link unfurlers), so /:slug pages are indexable
// and share with a correct title/description/preview.
const BOT_PATTERN =
  /bot|crawler|spider|facebookexternalhit|whatsapp|slackbot|linkedinbot|discordbot|telegrambot|pinterest/i

export const config = {
  matcher: ['/((?!login|registro|painel|assets|api|favicon|health).*)'],
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderProfileHtml(
  profile: { name: string; niche: string | null; profilePhotoUrl?: string | null },
  url: string,
  origin: string,
): string {
  const name = escapeHtml(profile.name)
  const title = `${name} · Agendamento`
  const description = profile.niche
    ? `Agende um horário com ${name} — ${escapeHtml(profile.niche)}. Confirmação na hora.`
    : `Agende um horário com ${name}. Confirmação na hora.`
  // Open Graph requires a fetchable URL — social crawlers don't resolve `data:` URIs
  // (the shape a profile photo takes when uploaded/cropped client-side, see
  // ProfilePage.tsx's cropImageToSquareDataUrl). No dedicated 1200x630 OG banner
  // exists yet either, so the app icon is the fallback for both cases.
  const image = escapeHtml(
    profile.profilePhotoUrl?.startsWith('https://') ? profile.profilePhotoUrl : `${origin}/android-chrome-512x512.png`,
  )
  // JSON.stringify doesn't escape "<", so an attacker-controlled name containing
  // "</script>" could break out of this script tag — escape it same as escapeHtml does.
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: profile.name,
    ...(profile.niche ? { serviceType: profile.niche } : {}),
    url,
  }).replace(/</g, '\\u003c')

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${escapeHtml(url)}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:type" content="profile" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:image" content="${image}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${image}" />
<script type="application/ld+json">${jsonLd}</script>
</head>
<body>
<h1>${name}</h1>
${profile.niche ? `<p>${escapeHtml(profile.niche)}</p>` : ''}
<p>Agende um horário disponível.</p>
</body>
</html>`
}

function renderSitemapXml(slugs: { slug: string; updatedAt: string }[], origin: string): string {
  const urls = slugs
    .map((s) => `<url><loc>${origin}/${escapeHtml(s.slug)}</loc><lastmod>${s.updatedAt.slice(0, 10)}</lastmod></url>`)
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
}

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url)

  // Served to every visitor (not just bots) — search engines fetch sitemap.xml
  // directly, with no guarantee of a recognizable crawler user-agent.
  if (url.pathname === '/sitemap.xml') {
    const apiUrl = process.env.API_URL
    if (!apiUrl) return next()
    try {
      const slugs: { slug: string; updatedAt: string }[] = []
      let cursor: string | null = null
      // /api/public/sitemap-slugs is cursor-paginated so the professional count
      // growing large never makes this one unbounded query — this loop just
      // walks every page. ponytail: hard cap, split into a sitemap index (per the
      // 50k-URL-per-file protocol limit) if the professional base ever gets there.
      for (let page = 0; page < 1000; page++) {
        const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
        const res = await fetch(`${apiUrl}/api/public/sitemap-slugs${qs}`)
        if (!res.ok) return next()
        const body = (await res.json()) as { items: { slug: string; updatedAt: string }[]; nextCursor: string | null }
        slugs.push(...body.items)
        cursor = body.nextCursor
        if (!cursor) break
      }
      return new Response(renderSitemapXml(slugs, url.origin), {
        headers: { 'content-type': 'application/xml; charset=utf-8' },
      })
    } catch {
      return next()
    }
  }

  const userAgent = request.headers.get('user-agent') ?? ''
  if (!BOT_PATTERN.test(userAgent)) return next()

  const slug = url.pathname.slice(1)
  // A slug is always `[a-z0-9-]+` (server/src/modules/auth/auth.schemas.ts) — never
  // dotted — so anything with a file extension is a static asset (favicon, manifest,
  // robots.txt, ...), not a profile page. Let it fall through to real static serving.
  const isSingleSegment = slug.length > 0 && !slug.includes('/') && !slug.includes('.')
  if (!isSingleSegment) return next()

  const apiUrl = process.env.API_URL
  if (!apiUrl) return next()

  try {
    const res = await fetch(`${apiUrl}/api/public/${encodeURIComponent(slug)}`)
    if (!res.ok) return new Response('Not found', { status: 404 })
    const profile = (await res.json()) as { name: string; niche: string | null; profilePhotoUrl?: string | null }
    const canonicalUrl = `${url.origin}${url.pathname}`
    return new Response(renderProfileHtml(profile, canonicalUrl, url.origin), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  } catch {
    return next()
  }
}
