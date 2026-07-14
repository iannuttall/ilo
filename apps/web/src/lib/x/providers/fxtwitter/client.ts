// FxTwitter API v2 adapter.
// Free, no-auth public API that returns tweet/status data plus author profiles.
// Used instead of RapidAPI wherever possible to keep free tools zero-cost.
//
// OpenAPI spec (source of truth for every field and endpoint shape):
//   https://api.fxtwitter.com/2/openapi.json
//
// When adding a new endpoint or field, fetch the spec fresh and mirror its
// types here rather than guessing. The spec is regenerated on every FxTwitter
// release, so stale types are the usual cause of subtle bugs.

// Public fxtwitter is shared across every Cloudflare Worker tenant on the
// same egress IP and imposes a 1000 req/min/IP ceiling. FX_BASE_URL lets us
// point at a self-hosted instance if we ever start tripping that limit.
// Minimal env shape kept separate from the full worker Env so tests and
// cross-package callers only pass the one knob they care about.
export type FxEnv = {
  FX_BASE_URL?: string
  // Single shared-secret header (e.g. FX_AUTH_HEADER='X-Ilo-Auth').
  FX_AUTH_HEADER?: string
  FX_AUTH_VALUE?: string
  // Cloudflare Access service token pair.
  FX_ACCESS_CLIENT_ID?: string
  FX_ACCESS_CLIENT_SECRET?: string
}

const FX_BASE_DEFAULT = 'https://api.fxtwitter.com'
const FX_MAX_RETRIES = 3
const FX_TIMEOUT_MS = 8_000
const FX_MAX_BACKOFF_MS = 5_000

const resolveFxBase = (env: FxEnv): string => {
  const override = env?.FX_BASE_URL?.trim()
  return override ? override.replace(/\/+$/, '') : FX_BASE_DEFAULT
}

// Collects the auth headers that should be attached to every outgoing
// fxtwitter request based on env. Public api.fxtwitter.com needs none; a
// self-hosted instance gated by a shared secret or Cloudflare Access does.
const resolveAuthHeaders = (env: FxEnv): Record<string, string> => {
  const headers: Record<string, string> = {}
  const headerName = env?.FX_AUTH_HEADER?.trim()
  const headerValue = env?.FX_AUTH_VALUE?.trim()
  if (headerName && headerValue) {
    headers[headerName] = headerValue
  }
  const accessId = env?.FX_ACCESS_CLIENT_ID?.trim()
  const accessSecret = env?.FX_ACCESS_CLIENT_SECRET?.trim()
  if (accessId && accessSecret) {
    headers['CF-Access-Client-Id'] = accessId
    headers['CF-Access-Client-Secret'] = accessSecret
  }
  return headers
}

// Retry-After on fxtwitter is plain seconds today, but the spec also permits
// an HTTP-date, so accept both. Returns milliseconds or null if absent or
// unparseable.
const parseRetryAfter = (res: Response): number | null => {
  const header = res.headers.get('retry-after')
  if (!header) return null
  const trimmed = header.trim()
  if (/^\d+$/.test(trimmed)) {
    return Math.max(0, Number(trimmed) * 1000)
  }
  const parsed = Date.parse(trimmed)
  if (!Number.isNaN(parsed)) {
    return Math.max(0, parsed - Date.now())
  }
  return null
}

const backoffMs = (attempt: number, retryAfterMs: number | null) => {
  const exponential = Math.min(500 * 2 ** attempt, FX_MAX_BACKOFF_MS)
  const serverHint =
    retryAfterMs != null ? Math.min(retryAfterMs, FX_MAX_BACKOFF_MS) : 0
  return Math.max(exponential, serverHint)
}

const isTransientFxError = (error: FxError) =>
  error.status === 400 ||
  error.status === 408 ||
  error.status === 409 ||
  error.status === 425 ||
  error.status === 429 ||
  error.status >= 500 ||
  error.message === 'fx_bad_body'

export type FxUser = {
  id: string
  name: string
  screen_name: string
  avatar_url: string | null
  banner_url: string | null
  description?: string
  followers?: number
  following?: number
  statuses?: number
  likes?: number
  verification?: {
    verified: boolean
    type?: string | null
  }
  joined?: string
  location?: string
  url?: string
  protected?: boolean
  website?: {
    url: string
    display_url: string
  } | null
}

export type FxMediaPhoto = {
  id?: string
  type: 'photo' | 'gif'
  url: string
  width: number
  height: number
  altText?: string
}

export type FxMediaVideoFormat = {
  url: string
  container?: 'mp4' | 'webm' | 'm3u8'
  codec?: 'h264' | 'hevc' | 'vp9' | 'av1'
  bitrate?: number
  height?: number
  width?: number
  size?: number
}

export type FxMediaVideo = {
  id?: string
  type: 'video' | 'gif'
  url: string
  width: number
  height: number
  thumbnail_url?: string | null
  duration?: number
  filesize?: number
  formats?: FxMediaVideoFormat[]
}

export type FxRawTextFacet = {
  type?: string
  url?: string
  expanded_url?: string
  expandedUrl?: string
  display_url?: string
  unwound_url?: string
  [key: string]: unknown
}

export type FxRawText = {
  text?: string
  facets?: FxRawTextFacet[]
  display_text_range?: number[]
}

export type FxReplyingTo = {
  screen_name?: string
  status?: string
  url?: string
  profile_url?: string
  display_name?: string
}

export type FxRepostedBy = {
  id?: string
  name?: string
  screen_name?: string
  avatar_url?: string | null
  url?: string
}

export type FxCard = {
  url?: string
  title?: string
  description?: string
  domain?: string
  card_name?: string
  image?: Record<string, unknown> | null
  [key: string]: unknown
}

// Article block/entity shapes returned inside APITwitterStatus.article. The
// fxtwitter article payload is Draft.js-derived: a list of content blocks
// with inline style + entity ranges, plus an entityMap keyed by stringified
// numbers. The OpenAPI spec lists entity types MARKDOWN / MEDIA / TWEET, but
// live payloads also include LINK, DIVIDER, and TWEMOJI. The union is kept
// open with `type: string` and a permissive `data` record so unknown variants
// pass through the renderer without breaking.
export type FxArticleBlock = {
  key: string
  type: string
  text: string
  data?: Record<string, unknown>
  entityRanges: Array<{ key: number; offset: number; length: number }>
  inlineStyleRanges: Array<{ style: string; offset: number; length: number }>
}

export type FxArticleEntity = {
  key: string
  value: {
    type: string
    mutability?: string
    data?: Record<string, unknown>
  }
}

export type FxArticleMediaEntity = {
  id?: string
  media_key?: string
  media_id?: string
  media_info?: Record<string, unknown>
}

export type FxArticle = {
  id: string
  title: string
  preview_text?: string
  created_at?: string
  modified_at?: string
  cover_media?: Record<string, unknown>
  content: {
    blocks: FxArticleBlock[]
    entityMap: FxArticleEntity[]
  }
  media_entities?: FxArticleMediaEntity[]
}

export type FxStatus = {
  type: 'status'
  id: string
  url: string
  text?: string
  raw_text?: FxRawText
  created_at: string
  created_timestamp?: number
  likes: number
  reposts: number
  quotes: number
  replies: number
  views?: number | null
  bookmarks?: number | null
  lang?: string | null
  possibly_sensitive?: boolean
  source?: string | null
  author: FxUser
  media?: {
    photos?: FxMediaPhoto[]
    videos?: FxMediaVideo[]
    external?: Record<string, unknown> | null
    all?: Array<Record<string, unknown>>
    mosaic?: Record<string, unknown> | null
    broadcast?: Record<string, unknown> | null
  }
  article?: FxArticle
  quote?: FxStatus | Record<string, unknown> | null
  replying_to?: FxReplyingTo | null
  reposted_by?: FxRepostedBy | null
  card?: FxCard | null
  embed_card?: string | null
  is_note_tweet?: boolean
}

export type FxStatusResponse = {
  code: number
  status: FxStatus | null
  thread: FxStatus[] | null
  author: FxUser | null
}

export type FxProfileResponse = {
  code: number
  message?: string
  user?: FxUser
  reason?: 'suspended'
  id?: string
}

export type FxCursor = {
  top?: string | null
  bottom?: string | null
} | null

export type FxSearchResults = {
  code: number
  results?: FxStatus[]
  cursor?: FxCursor
}

export type FxGroupedSearchResults = {
  code: number
  groups?: Array<{
    root: FxStatus
    thread?: FxStatus[]
  }>
  cursor?: FxCursor
}

export type FxUserListResults = {
  code: number
  results?: FxUser[]
  cursor?: FxCursor
}

export type FxProfileRelationshipList = {
  code: number
  results?: FxUser[]
  cursor?: FxCursor
}

export type FxTrend = {
  name: string
  post_count?: number | null
  url?: string | null
  description?: string | null
  category?: string | null
  grouping?: string | null
}

export type FxTrendsResponse = {
  code: number
  timeline_type?: string
  trends?: FxTrend[]
  cursor?: FxCursor
}

export type FxTypeaheadTopic = {
  id?: string
  name: string
  type?: string
  rounded_score?: number
}

export type FxTypeaheadEvent = {
  id?: string
  title?: string
  description?: string
  url?: string
}

export type FxTypeaheadResponse = {
  code: number
  query: string
  num_results?: number
  users?: FxUser[]
  topics?: FxTypeaheadTopic[]
  events?: FxTypeaheadEvent[]
}

export type FxSocialConversation = {
  code: number
  status: FxStatus | null
  thread?: FxStatus[]
  replies?: FxStatus[]
  author: FxUser | null
  cursor?: FxCursor
}

export type FxProfileAboutResponse = {
  code: number
  about?: {
    birthdate?: string | null
    location?: string | null
    website?: {
      url: string
      display_url: string
    } | null
  }
  user?: FxUser
}

export type FxSearchFeed = 'latest' | 'top' | 'media'
export type FxTypeaheadResultType = 'events' | 'users' | 'topics'

export class FxError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    // Populated when the upstream returns Retry-After on a 429 so retry
    // loops can honour the server's pacing hint instead of pure backoff.
    public readonly retryAfterMs?: number,
  ) {
    super(message)
    this.name = 'FxError'
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const fetchWithTimeout = async (
  url: string,
  timeoutMs: number,
  extraHeaders: Record<string, string>,
) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'ilo.so/1.0 (+https://ilo.so)',
        ...extraHeaders,
      },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

const fetchFxJson = async <TResponse, TResult>(
  env: FxEnv,
  path: string,
  extract: (body: TResponse) => TResult | null,
): Promise<TResult> => {
  const url = `${resolveFxBase(env)}${path}`
  const authHeaders = resolveAuthHeaders(env)

  let lastError: Error | null = null
  for (let attempt = 0; attempt <= FX_MAX_RETRIES; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url, FX_TIMEOUT_MS, authHeaders)

      if (res.status === 404) throw new FxError(404, 'fx_not_found')
      if (res.status === 401) throw new FxError(401, 'fx_unavailable')
      if (res.status === 429) {
        const retryAfterMs = parseRetryAfter(res) ?? undefined
        throw new FxError(429, 'fx_rate_limited', retryAfterMs)
      }
      if (res.status >= 500) {
        const retryAfterMs = parseRetryAfter(res) ?? undefined
        throw new FxError(res.status, 'fx_upstream_down', retryAfterMs)
      }
      if (!res.ok) throw new FxError(res.status, `fx_http_${res.status}`)

      const body = (await res.json().catch(() => null)) as TResponse | null
      if (!body) throw new FxError(502, 'fx_bad_body')

      const code = (body as { code?: number })?.code
      if (typeof code === 'number' && code >= 400) {
        if (code === 404) throw new FxError(404, 'fx_not_found')
        if (code === 401) throw new FxError(404, 'fx_unavailable')
        throw new FxError(code, `fx_upstream_${code}`)
      }

      const value = extract(body)
      if (!value) throw new FxError(404, 'fx_not_found')
      return value
    } catch (error) {
      let retryAfterMs: number | null = null
      if (error instanceof FxError) {
        const retriable = isTransientFxError(error)
        if (!retriable || attempt === FX_MAX_RETRIES) throw error
        retryAfterMs = error.retryAfterMs ?? null
        lastError = error
      } else {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt === FX_MAX_RETRIES)
          throw new FxError(502, 'fx_network_error')
      }
      await sleep(backoffMs(attempt, retryAfterMs))
    }
  }

  throw lastError ?? new FxError(502, 'fx_retry_exhausted')
}

// List endpoints (search, trends, followers, ...) can legitimately return an
// empty results array, so they cannot share fetchFxJson's "null means not
// found" extract contract. fetchFxBody just returns the parsed body after the
// HTTP/code validation that fetchFxJson performs.
const fetchFxBody = async <TResponse>(
  env: FxEnv,
  path: string,
): Promise<TResponse> =>
  fetchFxJson<TResponse, TResponse>(env, path, (body) => body as TResponse)

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const fetchFxStatus = (env: FxEnv, postId: string): Promise<FxStatus> =>
  fetchFxJson<FxStatusResponse, FxStatus>(
    env,
    `/2/status/${encodeURIComponent(postId)}`,
    (body) => body.status,
  )

export type FxThread = {
  status: FxStatus
  thread: FxStatus[]
  author: FxUser
}

// /2/thread/{id} returns the root status plus every reply from the same
// author as a flat chronological array. Passing a mid-thread id still
// returns the full thread, so callers do not need to resolve the root first.
export const fetchFxThread = (env: FxEnv, postId: string): Promise<FxThread> =>
  fetchFxJson<FxStatusResponse, FxThread>(
    env,
    `/2/thread/${encodeURIComponent(postId)}`,
    (body) => {
      if (!body.status || !body.author) return null
      const thread =
        Array.isArray(body.thread) && body.thread.length > 0
          ? body.thread
          : [body.status]
      return { status: body.status, thread, author: body.author }
    },
  )

// handleOrId accepts either a plain handle ("jack") or "id:<num>" for a
// direct numeric lookup. See the OpenAPI path /2/profile/{handle}.
export const fetchFxProfile = (
  env: FxEnv,
  handleOrId: string,
): Promise<FxUser> =>
  fetchFxJson<FxProfileResponse, FxUser>(
    env,
    `/2/profile/${encodeURIComponent(handleOrId)}`,
    (body) => body.user ?? null,
  )

export type FxSearchOptions = {
  q: string
  feed?: FxSearchFeed
  count?: number
  cursor?: string
  lang?: string
}

// /2/search executes a query server-side with the same operators X accepts in
// the search bar (from:, min_faves:, since:, lang:, filter:replies, ...).
export const fetchFxSearch = (
  env: FxEnv,
  options: FxSearchOptions,
): Promise<FxSearchResults> =>
  fetchFxBody<FxSearchResults>(
    env,
    `/2/search${buildQuery({
      q: options.q,
      feed: options.feed,
      count: options.count,
      cursor: options.cursor,
      lang: options.lang,
    })}`,
  )

export type FxTypeaheadOptions = {
  q: string
  result_type?: FxTypeaheadResultType | string
  src?: string
}

export const fetchFxTypeahead = (
  env: FxEnv,
  options: FxTypeaheadOptions,
): Promise<FxTypeaheadResponse> =>
  fetchFxBody<FxTypeaheadResponse>(
    env,
    `/2/typeahead${buildQuery({
      q: options.q,
      result_type: options.result_type,
      src: options.src,
    })}`,
  )

export type FxTrendsOptions = {
  type?: 'trending'
  count?: number
}

export const fetchFxTrends = (
  env: FxEnv,
  options: FxTrendsOptions = {},
): Promise<FxTrendsResponse> =>
  fetchFxBody<FxTrendsResponse>(
    env,
    `/2/trends${buildQuery({
      type: options.type,
      count: options.count,
    })}`,
  )

export type FxListPageOptions = {
  count?: number
  cursor?: string
  lang?: string
}

export const fetchFxStatusReposts = (
  env: FxEnv,
  postId: string,
  options: FxListPageOptions = {},
): Promise<FxUserListResults> =>
  fetchFxBody<FxUserListResults>(
    env,
    `/2/status/${encodeURIComponent(postId)}/reposts${buildQuery({
      count: options.count,
      cursor: options.cursor,
    })}`,
  )

export const fetchFxStatusQuotes = (
  env: FxEnv,
  postId: string,
  options: FxListPageOptions = {},
): Promise<FxSearchResults> =>
  fetchFxBody<FxSearchResults>(
    env,
    `/2/status/${encodeURIComponent(postId)}/quotes${buildQuery({
      count: options.count,
      cursor: options.cursor,
      lang: options.lang,
    })}`,
  )

export type FxConversationOptions = {
  ranking_mode?: 'likes' | 'recency'
  cursor?: string
  about_account?: string
  lang?: string
}

export const fetchFxConversation = (
  env: FxEnv,
  postId: string,
  options: FxConversationOptions = {},
): Promise<FxSocialConversation> =>
  fetchFxBody<FxSocialConversation>(
    env,
    `/2/conversation/${encodeURIComponent(postId)}${buildQuery({
      ranking_mode: options.ranking_mode,
      cursor: options.cursor,
      about_account: options.about_account,
      lang: options.lang,
    })}`,
  )

export type FxProfileStatusesOptions = {
  count?: number
  cursor?: string
  since?: number
  with_replies?: string
  groupthreads?: string
  lang?: string
}

// Returns either flat posts (APISearchResults) or grouped threads
// (APIGroupedSearchResults) when `groupthreads=1` is passed.
export const fetchFxProfileStatuses = (
  env: FxEnv,
  handle: string,
  options: FxProfileStatusesOptions = {},
): Promise<FxSearchResults | FxGroupedSearchResults> =>
  fetchFxBody<FxSearchResults | FxGroupedSearchResults>(
    env,
    `/2/profile/${encodeURIComponent(handle)}/statuses${buildQuery({
      count: options.count,
      cursor: options.cursor,
      since: options.since,
      with_replies: options.with_replies,
      groupthreads: options.groupthreads,
      lang: options.lang,
    })}`,
  )

export const fetchFxProfileArticles = (
  env: FxEnv,
  handle: string,
  options: FxListPageOptions = {},
): Promise<FxSearchResults> =>
  fetchFxBody<FxSearchResults>(
    env,
    `/2/profile/${encodeURIComponent(handle)}/articles${buildQuery({
      count: options.count,
      cursor: options.cursor,
      lang: options.lang,
    })}`,
  )

export const fetchFxProfileAbout = (
  env: FxEnv,
  handle: string,
): Promise<FxProfileAboutResponse> =>
  fetchFxBody<FxProfileAboutResponse>(
    env,
    `/2/profile/${encodeURIComponent(handle)}/about`,
  )

export const fetchFxProfileMedia = (
  env: FxEnv,
  handle: string,
  options: FxListPageOptions = {},
): Promise<FxSearchResults> =>
  fetchFxBody<FxSearchResults>(
    env,
    `/2/profile/${encodeURIComponent(handle)}/media${buildQuery({
      count: options.count,
      cursor: options.cursor,
      lang: options.lang,
    })}`,
  )

export const fetchFxProfileFollowers = (
  env: FxEnv,
  handle: string,
  options: FxListPageOptions = {},
): Promise<FxProfileRelationshipList> =>
  fetchFxBody<FxProfileRelationshipList>(
    env,
    `/2/profile/${encodeURIComponent(handle)}/followers${buildQuery({
      count: options.count,
      cursor: options.cursor,
    })}`,
  )

export const fetchFxProfileFollowing = (
  env: FxEnv,
  handle: string,
  options: FxListPageOptions = {},
): Promise<FxProfileRelationshipList> =>
  fetchFxBody<FxProfileRelationshipList>(
    env,
    `/2/profile/${encodeURIComponent(handle)}/following${buildQuery({
      count: options.count,
      cursor: options.cursor,
    })}`,
  )

// Normalized profile shape shared by the free tools that surface X profile
// data (twitter-id, twitter-username, profile picture downloader, and so on).
export type ProfileUser = {
  id: string
  name: string
  screen_name: string
  description: string
  profile_url: string
  avatar_url: string | null
  banner_url: string | null
  followers: number | null
  following: number | null
  tweets: number | null
  likes: number | null
  joined: string | null
  location: string
  protected: boolean
  verified: boolean
  website: string | null
  website_display: string | null
}

export const toProfileUser = (
  user: FxUser,
  fallbackHandle?: string,
): ProfileUser => {
  const handle = user.screen_name || fallbackHandle || ''
  return {
    id: user.id,
    name: user.name || handle,
    screen_name: handle,
    description: user.description ?? '',
    profile_url: user.url ?? (handle ? `https://x.com/${handle}` : ''),
    avatar_url: user.avatar_url ?? null,
    banner_url: user.banner_url ?? null,
    followers: user.followers ?? null,
    following: user.following ?? null,
    tweets: user.statuses ?? null,
    likes: user.likes ?? null,
    joined: user.joined ?? null,
    location: user.location ?? '',
    protected: Boolean(user.protected),
    verified: Boolean(user.verification?.verified),
    website: user.website?.url ?? null,
    website_display: user.website?.display_url ?? null,
  }
}
