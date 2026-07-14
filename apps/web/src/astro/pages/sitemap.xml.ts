import type { APIRoute } from 'astro'
import { listBlogEntries } from '../../lib/content/blog-manifest'
import { DOCS_MANIFEST } from '../../lib/docs-manifest'
import {
  buildSitemapXml,
  SITEMAP_CACHE_HEADERS,
  type SitemapEntry,
} from '../../lib/sitemap-builder'
import { xReportDocPath, xReportDocs } from '../../lib/x-report-docs'
import { ASTRO_TOOLS } from '../data/tools'

const staticPaths: SitemapEntry[] = [
  '/',
  '/tools',
  '/docs',
  '/docs/reports',
  '/blog',
].map((pathname) => ({ pathname }))

const uniqueEntries = (entries: SitemapEntry[]) => {
  const seen = new Set<string>()
  return entries.filter((entry) => {
    if (seen.has(entry.pathname)) return false
    seen.add(entry.pathname)
    return true
  })
}

export const SITEMAP_ENTRIES = uniqueEntries([
  ...staticPaths,
  ...ASTRO_TOOLS.map((tool) => ({ pathname: tool.href })),
  ...DOCS_MANIFEST.map((doc) => ({ pathname: `/docs/${doc.slug}` })),
  ...xReportDocs.map((report) => ({ pathname: xReportDocPath(report) })),
  ...listBlogEntries().map((post) => ({
    pathname: `/blog/${post.slug}`,
    lastmod: new Date(post.date).toISOString().slice(0, 10),
  })),
])

export const GET: APIRoute = ({ request }) =>
  new Response(buildSitemapXml(new URL(request.url).origin, SITEMAP_ENTRIES), {
    headers: SITEMAP_CACHE_HEADERS,
  })
