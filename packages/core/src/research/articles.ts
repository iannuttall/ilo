import {
  type FxTwitterClientOptions,
  type FxTwitterSearchPage,
  type FxTwitterStatus,
  fetchFxTwitterArticles,
  fetchFxTwitterStatus,
} from '../providers/x/fxtwitter.js'
import {
  createArticleMonitorRecord,
  deleteArticleMonitorRecord,
  failArticleMonitorRefreshRecord,
  finishArticleMonitorRefreshRecord,
  getArticleMonitorRecord,
  listArticleMonitorRecords,
  listArticleRecords,
  type StoredXArticle,
  setArticleMonitorEnabledRecord,
  storeArticleRecords,
  type XArticle,
  type XArticleMonitor,
} from '../storage/articles.js'
import { normalizeXHandle, toFtsQuery } from './followers.js'

export type XArticleResearchClient = {
  articles(
    handle: string,
    input: { count: number; cursor: string | null },
  ): Promise<FxTwitterSearchPage>
  status(postId: string): Promise<FxTwitterStatus>
}

export type XArticleMonitorRefreshResult = {
  monitor: XArticleMonitor
  pagesFetched: number
  articlesFetched: number
  articlesHydrated: number
  newArticles: number
  truncated: boolean
}

export type XArticleSearchResult = Omit<
  XArticle,
  'bodyText' | 'providerData'
> & {
  excerpt: string
  bodyCharacters: number
}

const comparePostIds = (left: string, right: string) => {
  try {
    const leftId = BigInt(left)
    const rightId = BigInt(right)
    return leftId === rightId ? 0 : leftId > rightId ? 1 : -1
  } catch {
    return left.localeCompare(right)
  }
}

const latestPostId = (posts: FxTwitterStatus[]) =>
  posts.reduce<string | null>(
    (latest, post) =>
      latest === null || comparePostIds(post.id, latest) > 0 ? post.id : latest,
    null,
  )

const postTimestamp = (post: FxTwitterStatus) => {
  if (typeof post.created_timestamp === 'number') {
    return post.created_timestamp < 1_000_000_000_000
      ? Math.round(post.created_timestamp * 1_000)
      : Math.round(post.created_timestamp)
  }
  const parsed = Date.parse(post.created_at)
  return Number.isNaN(parsed) ? Date.now() : parsed
}

const usefulTimestamp = (value: string | undefined, fallback: number) => {
  if (!value) return fallback
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed
}

const optionalTimestamp = (value: string | undefined) => {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed
}

const nestedString = (
  value: Record<string, unknown> | undefined,
  path: string[],
): string | null => {
  let current: unknown = value
  for (const key of path) {
    if (!current || typeof current !== 'object') return null
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'string' && current.trim() ? current : null
}

export const flattenXArticleBody = (post: FxTwitterStatus) =>
  (post.article?.content?.blocks ?? [])
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join('\n\n')

const cleanExcerpt = (value: string) => value.replace(/\s+/g, ' ').trim()

const articleExcerpt = (article: XArticle, query?: string) => {
  const body = cleanExcerpt(article.bodyText)
  const fallback = cleanExcerpt(article.previewText) || body
  if (!body || !query?.trim()) return fallback.slice(0, 320)
  const terms = query.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? []
  const lower = body.toLowerCase()
  const match = terms
    .map((term) => lower.indexOf(term))
    .find((index) => index >= 0)
  if (match === undefined) return fallback.slice(0, 320)
  const start = Math.max(0, match - 100)
  const end = Math.min(body.length, start + 320)
  return `${start > 0 ? '...' : ''}${body.slice(start, end).trim()}${end < body.length ? '...' : ''}`
}

const toStoredArticle = (
  post: FxTwitterStatus,
  now = Date.now(),
): StoredXArticle | null => {
  const article = post.article
  if (!article?.id || !article.title?.trim()) return null
  const postCreatedAt = postTimestamp(post)
  return {
    articleId: article.id,
    postId: post.id,
    url:
      post.url || `https://x.com/${post.author.screen_name}/status/${post.id}`,
    title: article.title.trim(),
    previewText: article.preview_text?.trim() ?? '',
    bodyText: flattenXArticleBody(post),
    coverImageUrl: nestedString(article.cover_media, [
      'media_info',
      'original_img_url',
    ]),
    createdAt: usefulTimestamp(article.created_at, postCreatedAt),
    modifiedAt: optionalTimestamp(article.modified_at),
    postCreatedAt,
    author: {
      id: post.author.id,
      handle: post.author.screen_name,
      name: post.author.name,
      bio: post.author.description?.trim() ?? '',
      avatarUrl: post.author.avatar_url ?? null,
      followers: post.author.followers ?? null,
      verified: Boolean(post.author.verification?.verified),
      verificationType: post.author.verification?.type ?? null,
    },
    firstSeenAt: now,
    lastSeenAt: now,
    providerDataJson: JSON.stringify(post),
  }
}

const defaultClient = (
  options: FxTwitterClientOptions = {},
): XArticleResearchClient => ({
  articles: (handle, input) => fetchFxTwitterArticles(handle, input, options),
  status: (postId) => fetchFxTwitterStatus(postId, options),
})

export const createXArticleMonitor = (input: {
  accountHandle: string
  sourceHandle: string
  databasePath?: string
}) =>
  createArticleMonitorRecord({
    accountHandle: normalizeXHandle(input.accountHandle),
    sourceHandle: normalizeXHandle(input.sourceHandle),
    path: input.databasePath,
  })

export const listXArticleMonitors = (
  input: {
    accountHandle?: string
    includeDisabled?: boolean
    databasePath?: string
  } = {},
) =>
  listArticleMonitorRecords({
    accountHandle: input.accountHandle
      ? normalizeXHandle(input.accountHandle)
      : undefined,
    includeDisabled: input.includeDisabled,
    path: input.databasePath,
  })

export const setXArticleMonitorEnabled = (input: {
  id: string
  enabled: boolean
  databasePath?: string
}) =>
  setArticleMonitorEnabledRecord({
    id: input.id.trim(),
    enabled: input.enabled,
    path: input.databasePath,
  })

export const deleteXArticleMonitor = (input: {
  id: string
  databasePath?: string
}) => deleteArticleMonitorRecord(input.id.trim(), input.databasePath)

export const refreshXArticleMonitor = async (
  input: {
    id: string
    maxPages?: number
    databasePath?: string
    fxtwitter?: FxTwitterClientOptions
  },
  client: XArticleResearchClient = defaultClient(input.fxtwitter),
): Promise<XArticleMonitorRefreshResult> => {
  const id = input.id.trim()
  const monitor = getArticleMonitorRecord(id, input.databasePath)
  if (!monitor) throw new Error('x_article_monitor_not_found')
  if (!monitor.enabled) throw new Error('x_article_monitor_disabled')
  const maxPages = input.maxPages ?? 3
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 100) {
    throw new Error('invalid_x_article_monitor_page_limit')
  }

  const continuingHistory = Boolean(monitor.cursor)
  let cursor: string | null = monitor.cursor
  let newestPostId = monitor.newestPostId
  let pagesFetched = 0
  let articlesFetched = 0
  let articlesHydrated = 0
  let newArticles = 0
  let reachedPreviousNewest = false
  const seenPostIds = new Set<string>()

  try {
    for (let page = 0; page < maxPages; page += 1) {
      const result = await client.articles(monitor.sourceHandle, {
        count: 100,
        cursor,
      })
      pagesFetched += 1
      articlesFetched += result.posts.length
      const pageNewest = latestPostId(result.posts)
      if (
        pageNewest &&
        (!newestPostId || comparePostIds(pageNewest, newestPostId) > 0)
      ) {
        newestPostId = pageNewest
      }

      const candidates = result.posts.filter((post) => {
        if (!post.article || seenPostIds.has(post.id)) return false
        seenPostIds.add(post.id)
        if (continuingHistory || !monitor.newestPostId) return true
        const comparison = comparePostIds(post.id, monitor.newestPostId)
        if (comparison <= 0) reachedPreviousNewest = true
        return comparison >= 0
      })
      const stored: StoredXArticle[] = []
      for (const post of candidates) {
        const hydrated = await client.status(post.id)
        articlesHydrated += 1
        const article = toStoredArticle(
          hydrated.article ? hydrated : post,
          Date.now(),
        )
        if (article) stored.push(article)
      }
      const saved = storeArticleRecords({
        monitorId: monitor.id,
        articles: stored,
        path: input.databasePath,
      })
      newArticles += saved.newArticles

      if (
        reachedPreviousNewest ||
        !result.nextCursor ||
        result.posts.length === 0
      ) {
        cursor = null
        break
      }
      if (result.nextCursor === cursor) {
        throw new Error('fxtwitter_article_cursor_stalled')
      }
      cursor = result.nextCursor
    }

    finishArticleMonitorRefreshRecord({
      id: monitor.id,
      newestPostId,
      cursor,
      historyComplete: cursor === null,
      path: input.databasePath,
    })
    const refreshed = getArticleMonitorRecord(monitor.id, input.databasePath)
    if (!refreshed) throw new Error('x_article_monitor_not_found')
    return {
      monitor: refreshed,
      pagesFetched,
      articlesFetched,
      articlesHydrated,
      newArticles,
      truncated: Boolean(cursor),
    }
  } catch (error) {
    failArticleMonitorRefreshRecord({
      id: monitor.id,
      error: error instanceof Error ? error.message : String(error),
      path: input.databasePath,
    })
    throw error
  }
}

export const refreshXArticles = async (
  input: {
    accountHandle: string
    maxPages?: number
    databasePath?: string
    fxtwitter?: FxTwitterClientOptions
  },
  client: XArticleResearchClient = defaultClient(input.fxtwitter),
) => {
  const accountHandle = normalizeXHandle(input.accountHandle)
  const monitors = listArticleMonitorRecords({
    accountHandle,
    path: input.databasePath,
  })
  const results: XArticleMonitorRefreshResult[] = []
  const failed: Array<{ monitor: XArticleMonitor; error: string }> = []
  for (const monitor of monitors) {
    try {
      results.push(
        await refreshXArticleMonitor(
          {
            id: monitor.id,
            maxPages: input.maxPages,
            databasePath: input.databasePath,
          },
          client,
        ),
      )
    } catch (error) {
      failed.push({
        monitor,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return {
    accountHandle,
    checked: monitors.length,
    newArticles: results.reduce(
      (total, result) => total + result.newArticles,
      0,
    ),
    results,
    failed,
  }
}

export const searchXArticles = (input: {
  accountHandle: string
  monitorId?: string
  sourceHandle?: string
  query?: string
  limit?: number
  databasePath?: string
}) => {
  if (
    input.limit !== undefined &&
    (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 10_000)
  ) {
    throw new Error('invalid_x_article_result_limit')
  }
  const articles = listArticleRecords({
    accountHandle: normalizeXHandle(input.accountHandle),
    monitorId: input.monitorId?.trim() || undefined,
    authorHandle: input.sourceHandle
      ? normalizeXHandle(input.sourceHandle)
      : undefined,
    ftsQuery: input.query?.trim() ? toFtsQuery(input.query) : undefined,
    limit: input.limit,
    path: input.databasePath,
  })
  return articles.map(
    ({ bodyText, providerData: _providerData, ...article }) => ({
      ...article,
      excerpt: articleExcerpt(
        { ...article, bodyText, providerData: null },
        input.query,
      ),
      bodyCharacters: bodyText.length,
    }),
  ) satisfies XArticleSearchResult[]
}

export const getXArticle = (input: {
  accountHandle: string
  identifier: string
  databasePath?: string
}) => {
  const article = listArticleRecords({
    accountHandle: normalizeXHandle(input.accountHandle),
    identifier: input.identifier.trim(),
    path: input.databasePath,
  }).at(0)
  if (!article) throw new Error('x_article_not_found')
  return article
}
