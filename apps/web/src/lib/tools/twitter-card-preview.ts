import { parseHTML } from 'linkedom/worker'

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])
const REQUEST_TIMEOUT_MS = 10_000
const MAX_HTML_BYTES = 1_000_000

type PreviewMode = 'twitter' | 'threads' | 'bluesky'

export type TwitterCardPreviewData = {
  title: string
  description: string
  image: string | null
  url: string
  card: string
}

export type TwitterCardPreviewResults = Record<string, string | null>

export type TwitterCardPreview = {
  data: TwitterCardPreviewData
  results: TwitterCardPreviewResults
}

const fetchWithTimeout = async (url: string, init?: RequestInit) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, {
      ...init,
      redirect: 'follow',
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

const isPrivateIpv4 = (hostname: string) => {
  const parts = hostname.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false
  }
  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  )
}

export const normalizePreviewUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) throw new Error('URL is required')
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  const url = new URL(candidate)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('URL must start with http:// or https://')
  }

  const hostname = url.hostname.toLowerCase()
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '[::1]' ||
    hostname === '::1' ||
    isPrivateIpv4(hostname)
  ) {
    throw new Error('URL must be public')
  }

  return url.toString()
}

const getDomainFromUrl = (value: string) => {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return value.replace(/^https?:\/\//, '').split('/')[0] ?? value
  }
}

const getMetaContent = (document: Document, selectors: string[]) => {
  for (const selector of selectors) {
    const value = document.querySelector(selector)?.getAttribute('content')
    if (value) return value.trim()
  }
  return null
}

const markFound = (
  results: TwitterCardPreviewResults,
  key: string,
  value: string | null,
) => {
  if (value !== null) results[key] = 'Found'
}

const resolveMaybeRelativeUrl = (value: string | null, baseUrl: string) => {
  if (!value) return null
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return value
  }
}

const validateImage = async (imageUrl: string) => {
  try {
    const response = await fetchWithTimeout(imageUrl, { method: 'HEAD' })
    if (!response.ok)
      return { ok: false, message: 'Image URL appears invalid.' }
    const contentType = response.headers.get('content-type')?.split(';')[0]
    if (!contentType || !IMAGE_MIME_TYPES.has(contentType.toLowerCase())) {
      return { ok: false, message: 'Image must be JPG, PNG, WEBP or GIF.' }
    }
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

const buildPreview = async (
  inputUrl: string,
  mode: PreviewMode,
): Promise<TwitterCardPreview> => {
  const url = normalizePreviewUrl(inputUrl)
  const response = await fetchWithTimeout(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': 'ilo Twitter Card Validator (+https://ilo.so)',
    },
  })

  if (!response.ok) throw new Error(response.statusText || 'Request failed')

  const contentLength = Number(response.headers.get('content-length') ?? 0)
  if (contentLength > MAX_HTML_BYTES) throw new Error('Page is too large')

  const resolvedUrl = response.url || url
  const html = await response.text()
  if (html.length > MAX_HTML_BYTES) throw new Error('Page is too large')

  const { document } = parseHTML(html)
  const includeTwitter = mode !== 'threads'
  const includeCard = mode === 'twitter'
  const results: TwitterCardPreviewResults = {
    title_meta: null,
    title_tag: null,
    description: null,
    'og:title': null,
    'og:description': null,
    'og:image': null,
  }
  if (includeTwitter) {
    results['twitter:title'] = null
    results['twitter:description'] = null
    results['twitter:image'] = null
  }
  if (includeCard) results['twitter:card'] = null

  const titleMeta = getMetaContent(document, ['meta[name="title"]'])
  markFound(results, 'title_meta', titleMeta)

  const titleTag = document.querySelector('title')?.textContent?.trim() || null
  markFound(results, 'title_tag', titleTag)

  const ogTitle = getMetaContent(document, [
    'meta[property="og:title"]',
    'meta[name="og:title"]',
  ])
  markFound(results, 'og:title', ogTitle)

  const ogDescription = getMetaContent(document, [
    'meta[property="og:description"]',
    'meta[name="og:description"]',
  ])
  markFound(results, 'og:description', ogDescription)

  const ogImage = resolveMaybeRelativeUrl(
    getMetaContent(document, [
      'meta[property="og:image"]',
      'meta[name="og:image"]',
    ]),
    resolvedUrl,
  )
  markFound(results, 'og:image', ogImage)

  const twitterTitle = includeTwitter
    ? getMetaContent(document, [
        'meta[name="twitter:title"]',
        'meta[property="twitter:title"]',
      ])
    : null
  if (includeTwitter) markFound(results, 'twitter:title', twitterTitle)

  const twitterDescription = includeTwitter
    ? getMetaContent(document, [
        'meta[name="twitter:description"]',
        'meta[property="twitter:description"]',
      ])
    : null
  if (includeTwitter) {
    markFound(results, 'twitter:description', twitterDescription)
  }

  const twitterImage = includeTwitter
    ? resolveMaybeRelativeUrl(
        getMetaContent(document, [
          'meta[name="twitter:image"]',
          'meta[property="twitter:image"]',
        ]),
        resolvedUrl,
      )
    : null
  if (includeTwitter) markFound(results, 'twitter:image', twitterImage)

  const twitterCard = includeCard
    ? getMetaContent(document, [
        'meta[name="twitter:card"]',
        'meta[property="twitter:card"]',
      ])
    : null
  if (includeCard) markFound(results, 'twitter:card', twitterCard)

  const preview: TwitterCardPreviewData = {
    title: (twitterTitle || ogTitle || titleMeta || titleTag || '').trim(),
    description: (twitterDescription || ogDescription || '').trim(),
    image: twitterImage || ogImage,
    url: getDomainFromUrl(resolvedUrl),
    card: twitterCard || (mode === 'threads' ? 'threads' : 'summary'),
  }

  if (preview.image) {
    const imageCheck = await validateImage(preview.image)
    if (!imageCheck.ok) {
      preview.card = 'summary'
      preview.image = null
      results.image = imageCheck.message ?? 'Image URL appears invalid.'
    }
  } else {
    preview.card = 'summary'
  }

  return { data: preview, results }
}

export const buildTwitterPreview = (inputUrl: string) =>
  buildPreview(inputUrl, 'twitter')

export const buildThreadsPreview = (inputUrl: string) =>
  buildPreview(inputUrl, 'threads')

export const buildBlueskyPreview = (inputUrl: string) =>
  buildPreview(inputUrl, 'bluesky')
