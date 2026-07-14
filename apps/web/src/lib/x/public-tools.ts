import type { Env } from '@/env'
import { extractXPostId } from '@/lib/x/post-url'
import {
  type FxGroupedSearchResults,
  type FxMediaVideo,
  type FxSearchResults,
  type FxStatus,
  fetchFxProfile,
  fetchFxProfileStatuses,
  fetchFxSearch,
  fetchFxStatus,
  fetchFxThread,
  toProfileUser,
} from '@/lib/x/providers/fxtwitter/client'

const USERNAME_REGEX = /^[A-Za-z0-9_]{1,15}$/
const URL_USERNAME_REGEX = /(?:x\.com|twitter\.com)\/(@?[A-Za-z0-9_]{1,15})/i

export const extractXHandle = (input: string) => {
  const trimmed = input.trim()
  if (!trimmed) return ''
  const urlMatch = trimmed.match(URL_USERNAME_REGEX)
  if (urlMatch) return urlMatch[1].replace(/^@+/, '')
  return trimmed.replace(/^@+/, '')
}

export const assertXHandle = (input: string) => {
  const handle = extractXHandle(input)
  if (!handle) throw new Error('Username is required')
  if (!USERNAME_REGEX.test(handle)) throw new Error('Enter a valid X username')
  return handle
}

export const mapFxStatus = (status: FxStatus) => ({
  post_id: status.id,
  post_url: status.url,
  text: status.text,
  created_at: status.created_at ?? null,
  created_timestamp: status.created_timestamp ?? null,
  lang: status.lang ?? null,
  reply_count: status.replies ?? 0,
  retweet_count: status.reposts ?? 0,
  like_count: status.likes ?? 0,
  quote_count: status.quotes ?? 0,
  view_count: status.views ?? null,
  bookmark_count: status.bookmarks ?? null,
  photos: (status.media?.photos ?? []).map((photo) => ({
    url: photo.url,
    width: photo.width ?? null,
    height: photo.height ?? null,
    alt_text: photo.altText ?? null,
  })),
  videos: (status.media?.videos ?? []).map((video) => ({
    url: video.url,
    thumbnail_url: video.thumbnail_url ?? null,
    width: video.width ?? null,
    height: video.height ?? null,
    duration: video.duration ?? null,
    kind: video.type === 'gif' ? 'gif' : 'video',
  })),
  author: {
    id: status.author.id,
    name: status.author.name,
    screen_name: status.author.screen_name,
    avatar_url: status.author.avatar_url ?? null,
    verified: Boolean(status.author.verification?.verified),
    protected: Boolean(status.author.protected),
  },
})

const extractStatuses = (results: FxSearchResults | FxGroupedSearchResults) => {
  if (Array.isArray((results as FxSearchResults).results)) {
    return (results as FxSearchResults).results ?? []
  }
  const statuses = new Map<string, FxStatus>()
  for (const group of (results as FxGroupedSearchResults).groups ?? []) {
    statuses.set(group.root.id, group.root)
    for (const status of group.thread ?? []) statuses.set(status.id, status)
  }
  return [...statuses.values()]
}

const sumStatuses = (statuses: FxStatus[]) => {
  let views = 0
  let engagements = 0
  let bookmarks = 0
  for (const status of statuses) {
    views += status.views ?? 0
    engagements +=
      (status.likes ?? 0) +
      (status.reposts ?? 0) +
      (status.quotes ?? 0) +
      (status.replies ?? 0)
    bookmarks += status.bookmarks ?? 0
  }
  return {
    posts: statuses.length,
    views,
    engagements,
    bookmarks,
    engagement_rate: views > 0 ? engagements / views : null,
    bookmark_rate: views > 0 ? bookmarks / views : null,
    avg_views_per_post: statuses.length > 0 ? views / statuses.length : null,
  }
}

export const getXProfileByHandle = async (env: Env, rawHandle: string) => {
  const handle = assertXHandle(rawHandle)
  return toProfileUser(await fetchFxProfile(env, handle), handle)
}

export const getXProfileById = async (env: Env, rawId: string) => {
  const id = rawId.trim().replace(/[\s,]/g, '')
  if (!/^\d{1,20}$/.test(id)) throw new Error('Twitter user ID is required')
  return toProfileUser(await fetchFxProfile(env, `id:${id}`))
}

export const getXProfileAnalytics = async (env: Env, rawHandle: string) => {
  const handle = assertXHandle(rawHandle)
  const [rawProfile, statusResults] = await Promise.all([
    fetchFxProfile(env, handle),
    fetchFxProfileStatuses(env, handle, { count: 20, with_replies: '0' }),
  ])
  return {
    profile: toProfileUser(rawProfile, handle),
    recent: sumStatuses(extractStatuses(statusResults)),
  }
}

export const searchXPosts = async (
  env: Env,
  input: {
    q: string
    feed?: string | null
    count?: number | null
    cursor?: string | null
  },
) => {
  const q = input.q.trim()
  if (!q) throw new Error('Search query is required')
  if (q.length > 512) throw new Error('Search query is too long')
  const feed =
    input.feed === 'top' || input.feed === 'media' ? input.feed : 'latest'
  const count = Math.min(50, Math.max(1, Math.floor(input.count ?? 20)))
  const results = await fetchFxSearch(env, {
    q,
    feed,
    count,
    cursor: input.cursor?.trim() || undefined,
  })
  return {
    feed,
    query: q,
    results: (results.results ?? []).map(mapFxStatus),
    next_cursor: results.cursor?.bottom ?? null,
  }
}

const countWords = (text: string) => {
  const trimmed = text.replace(/https?:\/\/\S+/g, '').trim()
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0
}

export const getXThread = async (env: Env, rawUrl: string) => {
  const postId = extractXPostId(rawUrl)
  if (!postId) throw new Error('Paste an X post URL or numeric post ID')
  const thread = await fetchFxThread(env, postId)
  const authorId = thread.author.id
  const authorPosts = thread.thread.filter(
    (post) => post.author.id === authorId,
  )
  const posts = (authorPosts.length > 0 ? authorPosts : thread.thread).map(
    mapFxStatus,
  )
  const wordCount = posts.reduce(
    (sum, post) => sum + countWords(post.text ?? ''),
    0,
  )
  return {
    root_post_id: thread.status.id,
    root_post_url: thread.status.url,
    author: {
      id: thread.author.id,
      name: thread.author.name,
      screen_name: thread.author.screen_name,
      avatar_url: thread.author.avatar_url ?? null,
      verified: Boolean(thread.author.verification?.verified),
      protected: Boolean(thread.author.protected),
    },
    posts,
    post_count: posts.length,
    word_count: wordCount,
    read_minutes: Math.max(1, Math.round(wordCount / 220)),
  }
}

const inferSizeFromUrl = (url: string) => {
  const match = url.match(/\/(\d+)x(\d+)\//)
  return match ? { width: Number(match[1]), height: Number(match[2]) } : {}
}

const qualityLabel = (height?: number | null, bitrate?: number | null) => {
  if (height) return `${height}p`
  if (!bitrate) return 'Source'
  if (bitrate >= 2_000_000) return '1080p'
  if (bitrate >= 800_000) return '720p'
  if (bitrate >= 400_000) return '480p'
  return 'Low'
}

const extractVideoVariants = (video: FxMediaVideo) => {
  const seen = new Set<string>()
  const variants = []
  for (const format of video.formats ?? []) {
    if (format.container !== 'mp4' || !format.url || seen.has(format.url)) {
      continue
    }
    seen.add(format.url)
    const size = inferSizeFromUrl(format.url)
    const width = format.width ?? size.width ?? null
    const height = format.height ?? size.height ?? null
    variants.push({
      url: format.url,
      content_type: 'video/mp4',
      bitrate: format.bitrate ?? null,
      width,
      height,
      label: qualityLabel(height, format.bitrate),
    })
  }
  if (!variants.length && video.url && !seen.has(video.url)) {
    const size = inferSizeFromUrl(video.url)
    const width = size.width ?? video.width ?? null
    const height = size.height ?? video.height ?? null
    variants.push({
      url: video.url,
      content_type: 'video/mp4',
      bitrate: null,
      width,
      height,
      label: qualityLabel(height, null),
    })
  }
  return variants.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))
}

export const getXVideo = async (env: Env, rawUrl: string) => {
  const postId = extractXPostId(rawUrl)
  if (!postId) throw new Error('Paste an X post URL or numeric post ID')
  const status = await fetchFxStatus(env, postId)
  const media = (status.media?.videos ?? [])
    .map((video) => ({
      kind: video.type === 'gif' ? 'gif' : 'video',
      poster_url: video.thumbnail_url ?? null,
      duration_ms:
        typeof video.duration === 'number'
          ? Math.round(video.duration * 1000)
          : null,
      width: video.width ?? null,
      height: video.height ?? null,
      variants: extractVideoVariants(video),
    }))
    .filter((item) => item.variants.length > 0)
  if (!media.length)
    throw new Error('This post does not contain a video or GIF')
  return {
    post_id: status.id,
    post_url: status.url,
    text: status.text,
    created_at: status.created_at ?? null,
    author: mapFxStatus(status).author,
    media,
  }
}
