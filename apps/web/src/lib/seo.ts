import { OG_TEMPLATE_HEIGHT, OG_TEMPLATE_WIDTH } from '@/lib/og-template'
import ogTemplateSource from '@/lib/og-template.tsx?raw'

export const SITE_NAME = 'ilo'
export const LEGACY_SITE_NAME = 'ilo.so'
export const HOME_DESCRIPTION =
  'Audit public 𝕏 performance from your app, agent, or CLI.'
export const SITE_CANONICAL = 'https://ilo.so'

export const OG_IMAGE_WIDTH = OG_TEMPLATE_WIDTH
export const OG_IMAGE_HEIGHT = OG_TEMPLATE_HEIGHT
export const OG_IMAGE_BASE_URL = 'https://ogtag.xyz/'

const TITLE_SITE_NAMES = [SITE_NAME, LEGACY_SITE_NAME]
const TITLE_SEPARATOR = ' | '
const TITLE_SEPARATOR_PATTERN = String.raw`\s*[|\u2013\u2014-]\s*`
const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const TITLE_SITE_NAMES_PATTERN = TITLE_SITE_NAMES.map(escapeRegExp).join('|')
const TITLE_PREFIX_REGEX = new RegExp(
  `^(?:${TITLE_SITE_NAMES_PATTERN})${TITLE_SEPARATOR_PATTERN}`,
  'i',
)
const TITLE_SUFFIX_REGEX = new RegExp(
  `${TITLE_SEPARATOR_PATTERN}(?:${TITLE_SITE_NAMES_PATTERN})$`,
  'i',
)

const normalizeBase = (value: string) => value.replace(/\/$/, '')

const hashString = (value: string) => {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}

const OG_TEMPLATE_HASH = hashString(ogTemplateSource)

export const stripSiteNameFromTitle = (title: string) => {
  const normalized = title
    .replace(TITLE_PREFIX_REGEX, '')
    .replace(TITLE_SUFFIX_REGEX, '')
    .trim()

  return normalized || title
}

const isSiteName = (value: string) =>
  TITLE_SITE_NAMES.some((name) => name.toLowerCase() === value.toLowerCase())

const SITE_NAME_WORD_REGEX = new RegExp(
  `\\b(?:${TITLE_SITE_NAMES_PATTERN})\\b`,
  'i',
)

const containsSiteName = (value: string) => SITE_NAME_WORD_REGEX.test(value)

export const buildPageTitle = (
  title: string,
  options?: { isHome?: boolean },
) => {
  const pageTitle = stripSiteNameFromTitle(title).trim()

  if (!pageTitle || isSiteName(pageTitle)) return SITE_NAME

  if (containsSiteName(pageTitle)) return pageTitle

  return options?.isHome
    ? `${SITE_NAME}${TITLE_SEPARATOR}${pageTitle}`
    : `${pageTitle}${TITLE_SEPARATOR}${SITE_NAME}`
}

export const HOME_TITLE = buildPageTitle('𝕏 performance audit infrastructure', {
  isHome: true,
})

export const buildCanonical = (pathname: string) => {
  const base = normalizeBase(SITE_CANONICAL)
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${base}${normalized}`
}

const getCurrentPathname = () => {
  const requestUrl = (globalThis as { __ILO_REQUEST_URL__?: string })
    .__ILO_REQUEST_URL__

  if (typeof window !== 'undefined') {
    return window.location.pathname || '/'
  }

  if (requestUrl) {
    try {
      return new URL(requestUrl).pathname || '/'
    } catch {
      return '/'
    }
  }

  return '/'
}

export const buildCurrentCanonical = () => {
  return buildCanonical(getCurrentPathname())
}

export const PRIVATE_SURFACE_PREFIXES = [
  '/lab',
  '/settings',
  '/account',
] as const

const matchesPathPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`)

export const isPrivateSurfacePathname = (pathname: string) => {
  return PRIVATE_SURFACE_PREFIXES.some((prefix) =>
    matchesPathPrefix(pathname, prefix),
  )
}

export const getRobotsDirectiveForPathname = (pathname: string) => {
  if (!isPrivateSurfacePathname(pathname)) return null
  return 'noindex, nofollow'
}

export const getCurrentRobotsDirective = () => {
  return getRobotsDirectiveForPathname(getCurrentPathname())
}

const buildOgImageVersion = (params: { title: string; description: string }) =>
  hashString(
    JSON.stringify({
      template: OG_TEMPLATE_HASH,
      siteName: SITE_NAME,
      title: stripSiteNameFromTitle(params.title),
      description: params.description,
    }),
  )

const buildOgImageUrl = (
  url: string,
  params: { title: string; description: string },
) => {
  const search = new URLSearchParams({
    url,
    v: buildOgImageVersion(params),
  })

  return `${OG_IMAGE_BASE_URL}?${search.toString()}`
}

export const buildMetaTags = (params: {
  title: string
  description?: string
  canonical: string
  isHome?: boolean
  ogType?: 'website' | 'article'
  includeImage?: boolean
}) => {
  const description = params.description ?? ''
  const includeImage = params.includeImage ?? true
  const title = buildPageTitle(params.title, { isHome: params.isHome })
  const ogType = params.ogType ?? (params.isHome ? 'website' : 'article')
  const ogImageUrl = buildOgImageUrl(params.canonical, {
    title,
    description,
  })
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:url', content: params.canonical },
      { property: 'og:description', content: description },
      { property: 'og:type', content: ogType },
      { property: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      ...(includeImage
        ? [
            { property: 'og:image', content: ogImageUrl },
            { property: 'og:image:type', content: 'image/png' },
            { property: 'og:image:width', content: String(OG_IMAGE_WIDTH) },
            { property: 'og:image:height', content: String(OG_IMAGE_HEIGHT) },
            { property: 'og:image:alt', content: SITE_NAME },
            { name: 'twitter:image', content: ogImageUrl },
            { name: 'twitter:image:alt', content: SITE_NAME },
          ]
        : []),
    ],
    links: [{ rel: 'canonical', href: params.canonical }],
  }
}
