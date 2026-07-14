import type { SitemapEntry } from '@/lib/sitemap-builder'

export {
  buildRobotsTxt,
  buildSitemapXml,
  ROBOTS_CACHE_HEADERS,
  SITEMAP_CACHE_HEADERS,
} from '@/lib/sitemap-builder'

type SitemapConfig =
  | true
  | { lastmod?: string }
  | (() => SitemapEntry[] | Promise<SitemapEntry[]>)

type SitemapRouteModule = {
  Route?: {
    fullPath?: string
    options?: {
      fullPath?: string
      path?: string
    }
  }
  sitemap?: SitemapConfig
}

const normalizePathname = (pathname: string) => {
  if (!pathname || pathname === '/') return '/'
  return pathname.replace(/\/+$/, '') || '/'
}

const resolveRoutePathname = (mod: SitemapRouteModule) => {
  const pathname =
    mod.Route?.fullPath ??
    mod.Route?.options?.fullPath ??
    mod.Route?.options?.path

  if (!pathname) return null

  const normalized = normalizePathname(pathname)
  return normalized.includes('$') ? null : normalized
}

export async function collectSitemapEntries(): Promise<SitemapEntry[]> {
  const routeModules = import.meta.glob<SitemapRouteModule>(
    '../routes/**/*.{ts,tsx}',
    { eager: true },
  )
  const entries = new Map<string, SitemapEntry>()

  for (const mod of Object.values(routeModules)) {
    const config = mod.sitemap
    if (!config) continue

    if (typeof config === 'function') {
      const dynamicEntries = await config()

      for (const entry of dynamicEntries) {
        const pathname = normalizePathname(entry.pathname)
        entries.set(pathname, { pathname, lastmod: entry.lastmod })
      }

      continue
    }

    const pathname = resolveRoutePathname(mod)
    if (!pathname) continue

    entries.set(pathname, {
      pathname,
      lastmod: config === true ? undefined : config.lastmod,
    })
  }

  return Array.from(entries.values()).sort((a, b) =>
    a.pathname.localeCompare(b.pathname),
  )
}
