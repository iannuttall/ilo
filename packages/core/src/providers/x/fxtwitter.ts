import { ILO_VERSION } from '../../version.js'

const FXTWITTER_BASE_URL = 'https://api.fxtwitter.com'
const FXTWITTER_TIMEOUT_MS = 10_000
const FXTWITTER_MAX_RETRIES = 3

export type FxTwitterUser = {
  id: string
  name: string
  screen_name: string
  avatar_url?: string | null
  banner_url?: string | null
  description?: string
  followers?: number
  following?: number
  statuses?: number
  likes?: number
  media_count?: number
  verification?: {
    verified: boolean
    verified_at?: string | null
    type?: string | null
  }
  joined?: string
  location?: string
  url?: string
  protected?: boolean
  type?: string
  raw_description?: unknown
  website?: {
    url: string
    display_url: string
  } | null
}

export type FxTwitterCursor = {
  top?: string | null
  bottom?: string | null
} | null

type FxTwitterProfileResponse = {
  code: number
  user?: FxTwitterUser
  message?: string
}

type FxTwitterFollowerResponse = {
  code: number
  results?: FxTwitterUser[]
  cursor?: FxTwitterCursor
  message?: string
}

export type FxTwitterFollowersPage = {
  profiles: FxTwitterUser[]
  nextCursor: string | null
}

export type FxTwitterReplyingTo = {
  screen_name?: string
  status?: string
  url?: string
  profile_url?: string
  display_name?: string
}

export type FxTwitterArticleBlock = {
  key: string
  type: string
  text: string
  data?: Record<string, unknown>
  entityRanges?: Array<{ key: number; offset: number; length: number }>
  inlineStyleRanges?: Array<{
    style: string
    offset: number
    length: number
  }>
}

export type FxTwitterArticleEntity = {
  key: string
  value: {
    type: string
    mutability?: string
    data?: Record<string, unknown>
  }
}

export type FxTwitterArticle = {
  id: string
  title: string
  preview_text?: string
  created_at?: string
  modified_at?: string
  cover_media?: Record<string, unknown>
  content?: {
    blocks?: FxTwitterArticleBlock[]
    entityMap?: FxTwitterArticleEntity[]
  }
  media_entities?: Array<Record<string, unknown>>
}

export type FxTwitterStatus = {
  type: 'status'
  id: string
  url: string
  text?: string
  created_at: string
  created_timestamp?: number
  likes: number
  reposts: number
  quotes: number
  replies: number
  views?: number | null
  bookmarks?: number | null
  lang?: string | null
  author: FxTwitterUser
  article?: FxTwitterArticle | null
  replying_to?: FxTwitterReplyingTo | null
  media?: Record<string, unknown>
  quote?: FxTwitterStatus | Record<string, unknown> | null
}

export type FxTwitterSearchFeed = 'latest' | 'top' | 'media'

export type FxTwitterSearchPage = {
  posts: FxTwitterStatus[]
  nextCursor: string | null
}

type FxTwitterSearchResponse = {
  code: number
  results?: FxTwitterStatus[]
  cursor?: FxTwitterCursor
  message?: string
}

type FxTwitterStatusResponse = {
  code: number
  status?: FxTwitterStatus | null
  message?: string
}

export type FxTwitterClientOptions = {
  baseUrl?: string
  fetch?: typeof fetch
  timeoutMs?: number
  maxRetries?: number
}

export class FxTwitterError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'FxTwitterError'
  }
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

const retryDelay = (attempt: number, response?: Response) => {
  const retryAfter = response?.headers.get('retry-after')
  if (retryAfter && /^\d+$/.test(retryAfter)) {
    return Math.min(Number(retryAfter) * 1_000, 5_000)
  }
  return Math.min(400 * 2 ** attempt, 5_000)
}

const requestFxTwitter = async <T extends { code?: number; message?: string }>(
  path: string,
  options: FxTwitterClientOptions,
): Promise<T> => {
  const baseUrl = (options.baseUrl ?? FXTWITTER_BASE_URL).replace(/\/+$/, '')
  const fetcher = options.fetch ?? fetch
  const timeoutMs = options.timeoutMs ?? FXTWITTER_TIMEOUT_MS
  const maxRetries = options.maxRetries ?? FXTWITTER_MAX_RETRIES

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    let response: Response | undefined
    try {
      response = await fetcher(`${baseUrl}${path}`, {
        headers: {
          accept: 'application/json',
          'user-agent': `ilo/${ILO_VERSION} (+https://ilo.so)`,
        },
        signal: controller.signal,
      })
      if (!response.ok) {
        const canRetry = response.status === 429 || response.status >= 500
        if (canRetry && attempt < maxRetries) {
          await wait(retryDelay(attempt, response))
          continue
        }
        throw new FxTwitterError(
          response.status,
          `fxtwitter_http_${response.status}`,
        )
      }
      const body = (await response.json()) as T
      if (typeof body.code === 'number' && body.code >= 400) {
        throw new FxTwitterError(
          body.code,
          body.message || `fxtwitter_upstream_${body.code}`,
        )
      }
      return body
    } catch (error) {
      if (error instanceof FxTwitterError) throw error
      if (attempt >= maxRetries) {
        throw new FxTwitterError(
          502,
          error instanceof Error && error.name === 'AbortError'
            ? 'fxtwitter_timeout'
            : 'fxtwitter_network_error',
        )
      }
      await wait(retryDelay(attempt, response))
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new FxTwitterError(502, 'fxtwitter_retry_exhausted')
}

export const fetchFxTwitterProfile = async (
  handle: string,
  options: FxTwitterClientOptions = {},
) => {
  const response = await requestFxTwitter<FxTwitterProfileResponse>(
    `/2/profile/${encodeURIComponent(handle)}`,
    options,
  )
  if (!response.user)
    throw new FxTwitterError(404, 'fxtwitter_profile_not_found')
  return response.user
}

export const fetchFxTwitterFollowers = async (
  handle: string,
  input: { count?: number; cursor?: string | null } = {},
  options: FxTwitterClientOptions = {},
): Promise<FxTwitterFollowersPage> => {
  const query = new URLSearchParams()
  query.set('count', String(Math.min(100, Math.max(1, input.count ?? 100))))
  if (input.cursor) query.set('cursor', input.cursor)
  const response = await requestFxTwitter<FxTwitterFollowerResponse>(
    `/2/profile/${encodeURIComponent(handle)}/followers?${query}`,
    options,
  )
  return {
    profiles: response.results ?? [],
    nextCursor: response.cursor?.bottom ?? null,
  }
}

export const fetchFxTwitterFollowing = async (
  handle: string,
  input: { count?: number; cursor?: string | null } = {},
  options: FxTwitterClientOptions = {},
): Promise<FxTwitterFollowersPage> => {
  const query = new URLSearchParams()
  query.set('count', String(Math.min(100, Math.max(1, input.count ?? 100))))
  if (input.cursor) query.set('cursor', input.cursor)
  const response = await requestFxTwitter<FxTwitterFollowerResponse>(
    `/2/profile/${encodeURIComponent(handle)}/following?${query}`,
    options,
  )
  return {
    profiles: response.results ?? [],
    nextCursor: response.cursor?.bottom ?? null,
  }
}

export const fetchFxTwitterSearch = async (
  input: {
    query: string
    feed?: FxTwitterSearchFeed
    count?: number
    cursor?: string | null
    language?: string
  },
  options: FxTwitterClientOptions = {},
): Promise<FxTwitterSearchPage> => {
  const searchQuery = input.query.trim()
  if (!searchQuery) throw new Error('fxtwitter_search_query_required')
  const query = new URLSearchParams({
    q: searchQuery,
    feed: input.feed ?? 'latest',
    count: String(Math.min(100, Math.max(1, input.count ?? 100))),
  })
  if (input.cursor) query.set('cursor', input.cursor)
  if (input.language?.trim()) query.set('lang', input.language.trim())
  try {
    const response = await requestFxTwitter<FxTwitterSearchResponse>(
      `/2/search?${query}`,
      options,
    )
    return {
      posts: response.results ?? [],
      nextCursor: response.cursor?.bottom ?? null,
    }
  } catch (error) {
    if (error instanceof FxTwitterError && error.status === 404) {
      return { posts: [], nextCursor: null }
    }
    throw error
  }
}

export const fetchFxTwitterArticles = async (
  handle: string,
  input: { count?: number; cursor?: string | null; language?: string } = {},
  options: FxTwitterClientOptions = {},
): Promise<FxTwitterSearchPage> => {
  const query = new URLSearchParams()
  query.set('count', String(Math.min(100, Math.max(1, input.count ?? 100))))
  if (input.cursor) query.set('cursor', input.cursor)
  if (input.language?.trim()) query.set('lang', input.language.trim())
  const response = await requestFxTwitter<FxTwitterSearchResponse>(
    `/2/profile/${encodeURIComponent(handle)}/articles?${query}`,
    options,
  )
  return {
    posts: response.results ?? [],
    nextCursor: response.cursor?.bottom ?? null,
  }
}

export const fetchFxTwitterStatus = async (
  postId: string,
  options: FxTwitterClientOptions = {},
): Promise<FxTwitterStatus> => {
  const response = await requestFxTwitter<FxTwitterStatusResponse>(
    `/2/status/${encodeURIComponent(postId)}`,
    options,
  )
  if (!response.status)
    throw new FxTwitterError(404, 'fxtwitter_status_not_found')
  return response.status
}
