import type { APIRoute } from 'astro'
import { buildRobotsTxt, ROBOTS_CACHE_HEADERS } from '../../lib/sitemap-builder'

export const prerender = true

export const GET: APIRoute = ({ request }) =>
  new Response(buildRobotsTxt(new URL(request.url).origin), {
    headers: ROBOTS_CACHE_HEADERS,
  })
