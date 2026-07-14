import { PRIVATE_SURFACE_PREFIXES } from '@/lib/seo'

export type SitemapEntry = {
  pathname: string
  lastmod?: string
}

const CACHE_CONTROL =
  'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800'

const CDN_CACHE_CONTROL = 'max-age=86400'

const normalizePathname = (pathname: string) => {
  if (!pathname || pathname === '/') return '/'
  return pathname.replace(/\/+$/, '') || '/'
}

const toAbsoluteUrl = (origin: string, pathname: string) =>
  new URL(normalizePathname(pathname), origin).toString()

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

export const SITEMAP_CACHE_HEADERS = {
  'Cache-Control': CACHE_CONTROL,
  'CDN-Cache-Control': CDN_CACHE_CONTROL,
  'Content-Type': 'application/xml; charset=utf-8',
}

export const ROBOTS_CACHE_HEADERS = {
  'Cache-Control': CACHE_CONTROL,
  'CDN-Cache-Control': CDN_CACHE_CONTROL,
  'Content-Type': 'text/plain; charset=utf-8',
}

export function buildSitemapXml(origin: string, entries: SitemapEntry[]) {
  const body = entries
    .map((entry) => {
      const lines = [
        '  <url>',
        `    <loc>${escapeXml(toAbsoluteUrl(origin, entry.pathname))}</loc>`,
        ...(entry.lastmod
          ? [`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`]
          : []),
        '  </url>',
      ]

      return lines.join('\n')
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    '</urlset>',
  ].join('\n')
}

export function buildRobotsTxt(origin: string) {
  return [
    'User-agent: *',
    'Content-Signal: search=yes, ai-train=no, ai-input=no',
    'Allow: /',
    ...PRIVATE_SURFACE_PREFIXES.map((prefix) => `Disallow: ${prefix}`),
    '',
    `Sitemap: ${toAbsoluteUrl(origin, '/sitemap.xml')}`,
  ].join('\n')
}
