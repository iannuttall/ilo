import { createApiRouter } from '@/api/router'
import { ASTRO_TOOLS } from '@/astro/data/tools'
import type { Env } from '@/env'
import { maybeServeMarkdownResponse } from '@/lib/markdown-negotiation'
import { getRobotsDirectiveForPathname } from '@/lib/seo'

export type PageRenderer = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
) => Promise<Response>
const api = createApiRouter()

const PUBLIC_PATHS = new Set([
  '/',
  '/blog',
  '/changelog',
  '/docs',
  '/pricing',
  '/privacy',
  '/reports',
  '/terms',
  '/tools',
  ...ASTRO_TOOLS.map((tool) => tool.href),
])
const PUBLIC_PREFIXES = ['/blog/', '/docs/', '/reports/']
const normalizePathname = (pathname: string) =>
  pathname === '/' ? pathname : pathname.replace(/\/+$/, '') || '/'
export const isPublicPagePathname = (pathname: string) => {
  const normalized = normalizePathname(pathname)
  return (
    PUBLIC_PATHS.has(normalized) ||
    PUBLIC_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  )
}

const LEGACY_PATH_REDIRECTS = new Map<string, string>([
  ['/api', '/docs/api'],
  ['/billing', '/docs/start'],
  ['/dashboard', '/docs/start'],
  ['/forgot-password', '/docs/start'],
  ['/login', '/docs/start'],
  ['/join', '/docs/start'],
  ['/signup', '/docs/start'],
  ['/settings', '/docs/start'],
  ['/workspaces', '/docs/start'],
  ['/embeds', '/tools'],
  ['/ilo-counter-widget', '/blog/twitter-follower-widget-ios'],
  ['/ilo-streak-widget', '/blog/twitter-follower-widget-ios'],
  ['/ilo-twitter-follower-widget', '/blog/twitter-follower-widget-ios'],
  ['/ilo-twitter-streak-widget', '/blog/twitter-follower-widget-ios'],
  ['/privacy-policy', '/privacy'],
  ['/twitter-ios-widgets', '/blog/twitter-follower-widget-ios'],
  ['/widgets', '/blog/twitter-follower-widget-ios'],
  ['/x-link-preview', '/twitter-card-validator'],
  ['/x-search', '/twitter-search-without-account'],
  ['/x-thread-unroller', '/twitter-thread-reader'],
  ['/x-video-downloader', '/twitter-video-downloader'],
])
const LEGACY_BLOG_RENAMES = new Map<string, string>([
  [
    'how-to-create-a-metrics-dashboard-for-your-brand',
    'social-media-metrics-dashboard',
  ],
  ['30-tips-for-a-better-twitter-bio', 'twitter-bio-ideas'],
  [
    'does-the-twitter-algorithm-penalise-tweets-with-links',
    'twitter-link-penalty',
  ],
  ['how-to-pin-a-twitter-list-for-easy-access', 'pin-twitter-list'],
  [
    'how-to-stop-someone-from-following-you-on-twitter-soft-block',
    'remove-twitter-follower',
  ],
  ['how-to-track-twitter-followers-over-time', 'track-twitter-followers'],
  ['how-to-view-analytics-metrics-for-a-single-tweet', 'tweet-analytics'],
  ['key-engagements-that-help-twitter-growth', 'twitter-engagement-metrics'],
  ['quickly-search-tweets', 'search-your-tweets'],
  ['show-live-twitter-followers-ios-widget', 'twitter-follower-widget-ios'],
  [
    'the-top-3-metrics-to-understand-your-twitter-spaces',
    'twitter-spaces-analytics',
  ],
  ['what-does-impression-on-twitter-mean', 'twitter-impressions'],
])
const LEGACY_PRUNED_BLOG_SLUGS = new Set([
  'the-new-ilo',
  'easily-switch-from-twitter-to-ilo',
  'embed-ilo-charts-on-any-web-page',
  'week-over-week-twitter-follower-growth',
  'what-is-epi',
  'how-to-get-newsletter-subscribers-from-your-twitter-profile',
  'tweet-every-day',
  'the-lazy-girls-guide-to-twitter',
  '5-ways-to-use-twitter-lists-to-grow-on-twitter',
  'grow-on-twitter-with-video',
  'how-to-create-a-reminder',
  'how-to-level-up-your-twitter-game-graphics',
  '5-reasons-you-should-schedule-tweets',
  'practical-ways-to-grow-on-twitter',
  'starting-twitter-at-ground-zero',
  'a-beginners-guide-to-building-a-twitter-presence',
  '5-actionable-ways-to-grow-a-brand-twitter-account',
  'how-to-efficiently-grow-a-twitter-audience',
  'create-better-twitter-content-using-analytics',
  'how-to-get-your-first-1000-twitter-followers',
  'twitter-for-bloggers',
  'view-the-chronological-timeline-on-twitter',
  'get-more-consistent-on-twitter-with-tweet-streaks',
])

const legacyRedirect = (request: Request) => {
  if (!['GET', 'HEAD'].includes(request.method)) return null
  const url = new URL(request.url)
  const pathname = normalizePathname(url.pathname)
  const blogSlug = pathname.match(/^\/blog\/([^/]+)$/)?.[1]
  const target =
    LEGACY_PATH_REDIRECTS.get(pathname) ??
    (blogSlug && LEGACY_BLOG_RENAMES.has(blogSlug)
      ? `/blog/${LEGACY_BLOG_RENAMES.get(blogSlug)}`
      : null) ??
    (blogSlug && LEGACY_PRUNED_BLOG_SLUGS.has(blogSlug) ? '/blog' : null) ??
    (pathname.startsWith('/settings/') ||
    pathname.startsWith('/accounts/') ||
    pathname.startsWith('/connect/')
      ? '/docs/start'
      : null)
  return target ? new URL(target, url.origin).toString() : null
}

const withResponseHeaders = (response: Response, pathname: string) => {
  const headers = new Headers(response.headers)
  const robots = getRobotsDirectiveForPathname(pathname)
  if (robots) headers.set('X-Robots-Tag', robots)
  if (isPublicPagePathname(pathname) && response.ok) {
    headers.set(
      'Cache-Control',
      'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
    )
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export const handleIloAppRequest = async (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  renderPage: PageRenderer,
) => {
  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/')) return api.fetch(request, env, ctx)
  const rendered = await renderPage(request, env, ctx)
  if (!isPublicPagePathname(url.pathname)) return rendered
  return maybeServeMarkdownResponse(request, rendered)
}

export const createIloWorker = (renderPage: PageRenderer) =>
  ({
    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
      const pathname = new URL(request.url).pathname
      const redirect = legacyRedirect(request)
      if (redirect)
        return withResponseHeaders(Response.redirect(redirect, 308), pathname)
      const response = await handleIloAppRequest(request, env, ctx, renderPage)
      return withResponseHeaders(response, pathname)
    },
  }) satisfies ExportedHandler<Env>
