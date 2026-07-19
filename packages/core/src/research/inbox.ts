import {
  type FxTwitterClientOptions,
  type FxTwitterSearchPage,
  type FxTwitterStatus,
  fetchFxTwitterSearch,
} from '../providers/x/fxtwitter.js'
import {
  createMonitorRecord,
  deleteMonitorRecord,
  failMonitorRefreshRecord,
  finishMonitorRefreshRecord,
  getInboxRecord,
  getMonitorRecord,
  listInboxRecords,
  listMonitorRecords,
  type StoredInboxPost,
  setMonitorEnabledRecord,
  storeMonitorPosts,
  updateInboxStateRecord,
  type XInboxItem,
  type XInboxStateAction,
  type XInboxStatus,
  type XMonitor,
} from '../storage/inbox.js'
import {
  clearInboxFeedbackRecord,
  listInboxFeedbackEvidenceRecords,
  recordInboxFeedbackRecord,
  type XInboxFeedbackReason,
  type XInboxFeedbackValue,
} from '../storage/inbox-feedback.js'
import { normalizeXHandle, toFtsQuery } from './followers.js'
import {
  rankXInbox,
  type XInboxRankedItem,
  type XInboxSignal,
} from './inbox-signal.js'

export type XMonitorResearchClient = {
  search(input: {
    query: string
    count: number
    cursor: string | null
  }): Promise<FxTwitterSearchPage>
}

export type XMonitorRefreshResult = {
  monitor: XMonitor
  pagesFetched: number
  postsFetched: number
  newItems: number
  newMatches: number
  truncated: boolean
}

export type XInboxSort = 'recent' | 'signal'

export type XInboxResultItem = XInboxItem & { signal?: XInboxSignal }

const cleanRequired = (
  value: string,
  input: { code: string; maximum: number },
) => {
  const cleaned = value.trim()
  if (!cleaned) throw new Error(input.code)
  if (cleaned.length > input.maximum) throw new Error(`${input.code}_too_long`)
  return cleaned
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

const toStoredPost = (post: FxTwitterStatus, now: number): StoredInboxPost => ({
  postId: post.id,
  url: post.url || `https://x.com/${post.author.screen_name}/status/${post.id}`,
  text: post.text?.trim() ?? '',
  createdAt: postTimestamp(post),
  language: post.lang ?? null,
  likes: post.likes ?? 0,
  reposts: post.reposts ?? 0,
  quotes: post.quotes ?? 0,
  replies: post.replies ?? 0,
  views: post.views ?? null,
  bookmarks: post.bookmarks ?? null,
  replyingToPostId: post.replying_to?.status ?? null,
  author: {
    id: post.author.id,
    handle: post.author.screen_name,
    name: post.author.name,
    bio: post.author.description?.trim() ?? '',
    avatarUrl: post.author.avatar_url ?? null,
    followers: post.author.followers ?? null,
    following: post.author.following ?? null,
    verified: Boolean(post.author.verification?.verified),
    verificationType: post.author.verification?.type ?? null,
  },
  firstSeenAt: now,
  lastSeenAt: now,
  providerDataJson: JSON.stringify(post),
})

const defaultClient = (
  options: FxTwitterClientOptions = {},
): XMonitorResearchClient => ({
  search: (input) =>
    fetchFxTwitterSearch(
      {
        query: input.query,
        feed: 'latest',
        count: input.count,
        cursor: input.cursor,
      },
      options,
    ),
})

export const createXMonitor = (input: {
  accountHandle: string
  name: string
  query: string
  databasePath?: string
}) =>
  createMonitorRecord({
    accountHandle: normalizeXHandle(input.accountHandle),
    name: cleanRequired(input.name, {
      code: 'x_monitor_name_required',
      maximum: 80,
    }),
    query: cleanRequired(input.query, {
      code: 'x_monitor_query_required',
      maximum: 512,
    }),
    path: input.databasePath,
  })

export const listXMonitors = (
  input: {
    accountHandle?: string
    includeDisabled?: boolean
    databasePath?: string
  } = {},
) =>
  listMonitorRecords({
    accountHandle: input.accountHandle
      ? normalizeXHandle(input.accountHandle)
      : undefined,
    includeDisabled: input.includeDisabled,
    path: input.databasePath,
  })

export const setXMonitorEnabled = (input: {
  id: string
  enabled: boolean
  databasePath?: string
}) =>
  setMonitorEnabledRecord({
    id: input.id.trim(),
    enabled: input.enabled,
    path: input.databasePath,
  })

export const deleteXMonitor = (input: { id: string; databasePath?: string }) =>
  deleteMonitorRecord(input.id.trim(), input.databasePath)

export const refreshXMonitor = async (
  input: {
    id: string
    maxPages?: number
    databasePath?: string
    fxtwitter?: FxTwitterClientOptions
  },
  client: XMonitorResearchClient = defaultClient(input.fxtwitter),
): Promise<XMonitorRefreshResult> => {
  const id = input.id.trim()
  const monitor = getMonitorRecord(id, input.databasePath)
  if (!monitor) throw new Error('x_monitor_not_found')
  if (!monitor.enabled) throw new Error('x_monitor_disabled')
  const maxPages = input.maxPages ?? 3
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 100) {
    throw new Error('invalid_x_monitor_page_limit')
  }

  let cursor: string | null = null
  let newestPostId = monitor.newestPostId
  let pagesFetched = 0
  let postsFetched = 0
  let newItems = 0
  let newMatches = 0
  let reachedPreviousNewest = false

  try {
    for (let page = 0; page < maxPages; page += 1) {
      const result = await client.search({
        query: monitor.query,
        count: 100,
        cursor,
      })
      pagesFetched += 1
      postsFetched += result.posts.length
      const pageNewest = latestPostId(result.posts)
      if (
        pageNewest &&
        (!newestPostId || comparePostIds(pageNewest, newestPostId) > 0)
      ) {
        newestPostId = pageNewest
      }
      const freshPosts = monitor.newestPostId
        ? result.posts.filter((post) => {
            const isNew =
              comparePostIds(post.id, monitor.newestPostId as string) > 0
            if (!isNew) reachedPreviousNewest = true
            return isNew
          })
        : result.posts
      const stored = storeMonitorPosts({
        monitorId: monitor.id,
        posts: freshPosts.map((post) => toStoredPost(post, Date.now())),
        path: input.databasePath,
      })
      newItems += stored.newItems
      newMatches += stored.newMatches
      if (
        reachedPreviousNewest ||
        !result.nextCursor ||
        result.posts.length === 0
      ) {
        cursor = null
        break
      }
      if (result.nextCursor === cursor) {
        throw new Error('fxtwitter_search_cursor_stalled')
      }
      cursor = result.nextCursor
    }
    finishMonitorRefreshRecord({
      id: monitor.id,
      newestPostId,
      path: input.databasePath,
    })
    const refreshed = getMonitorRecord(monitor.id, input.databasePath)
    if (!refreshed) throw new Error('x_monitor_not_found')
    return {
      monitor: refreshed,
      pagesFetched,
      postsFetched,
      newItems,
      newMatches,
      truncated: Boolean(cursor && !reachedPreviousNewest),
    }
  } catch (error) {
    failMonitorRefreshRecord({
      id: monitor.id,
      error: error instanceof Error ? error.message : String(error),
      path: input.databasePath,
    })
    throw error
  }
}

export const refreshXInbox = async (
  input: {
    accountHandle: string
    maxPages?: number
    databasePath?: string
    fxtwitter?: FxTwitterClientOptions
  },
  client: XMonitorResearchClient = defaultClient(input.fxtwitter),
) => {
  const accountHandle = normalizeXHandle(input.accountHandle)
  const monitors = listMonitorRecords({
    accountHandle,
    path: input.databasePath,
  })
  const results: XMonitorRefreshResult[] = []
  const failed: Array<{ monitor: XMonitor; error: string }> = []
  for (const monitor of monitors) {
    try {
      results.push(
        await refreshXMonitor(
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
    newItems: results.reduce((total, result) => total + result.newItems, 0),
    newMatches: results.reduce((total, result) => total + result.newMatches, 0),
    results,
    failed,
  }
}

const normalizeLanguage = (value?: string) => {
  const language = value?.trim().toLowerCase()
  if (!language) return undefined
  if (!/^[a-z]{2,3}(?:-[a-z0-9]+)*$/.test(language)) {
    throw new Error('invalid_x_inbox_language')
  }
  return language
}

export const listXInbox = (input: {
  accountHandle: string
  monitorId?: string
  status?: XInboxStatus
  language?: string
  verified?: boolean
  followsMe?: boolean
  iFollow?: boolean
  query?: string
  limit?: number
  sort?: XInboxSort
  explain?: boolean
  now?: number
  databasePath?: string
}): XInboxResultItem[] => {
  const sort = input.sort ?? 'recent'
  if (sort !== 'recent' && sort !== 'signal') {
    throw new Error('invalid_x_inbox_sort')
  }
  const limit = Math.min(500, Math.max(1, input.limit ?? 50))
  const includeSignal = sort === 'signal' || input.explain === true
  const items = listInboxRecords({
    accountHandle: normalizeXHandle(input.accountHandle),
    monitorId: input.monitorId?.trim() || undefined,
    status: input.status,
    language: normalizeLanguage(input.language),
    verified: input.verified,
    followsMe: input.followsMe,
    iFollow: input.iFollow,
    ftsQuery: input.query?.trim() ? toFtsQuery(input.query) : undefined,
    limit: includeSignal ? 500 : limit,
    path: input.databasePath,
  })
  if (!includeSignal) return items
  const ranked = rankXInbox({
    items,
    feedback: listInboxFeedbackEvidenceRecords({
      accountHandle: normalizeXHandle(input.accountHandle),
      path: input.databasePath,
    }),
    now: input.now,
  })
  if (sort === 'signal') return ranked.slice(0, limit)
  const byPostId = new Map(ranked.map((item) => [item.postId, item]))
  return items
    .map((item) => byPostId.get(item.postId) as XInboxRankedItem)
    .slice(0, limit)
}

const feedbackReasons = new Set<XInboxFeedbackReason>([
  'relevant',
  'original',
  'actionable',
  'primary-source',
  'duplicate',
  'promotional',
  'irrelevant',
  'wrong-language',
  'too-shallow',
  'other',
])

export const recordXInboxFeedback = (input: {
  accountHandle: string
  postId: string
  value: XInboxFeedbackValue | 'clear'
  reason?: XInboxFeedbackReason
  note?: string
  databasePath?: string
  now?: number
}) => {
  const accountHandle = normalizeXHandle(input.accountHandle)
  const postId = input.postId.trim()
  if (!postId) throw new Error('x_inbox_post_id_required')
  if (input.value === 'clear') {
    clearInboxFeedbackRecord({
      accountHandle,
      postId,
      path: input.databasePath,
    })
    return null
  }
  if (input.value !== 'useful' && input.value !== 'not_useful') {
    throw new Error('invalid_x_inbox_feedback_value')
  }
  if (input.reason && !feedbackReasons.has(input.reason)) {
    throw new Error('invalid_x_inbox_feedback_reason')
  }
  const note = input.note?.trim() || null
  if (note && note.length > 500) {
    throw new Error('x_inbox_feedback_note_too_long')
  }
  return recordInboxFeedbackRecord({
    accountHandle,
    postId,
    value: input.value,
    reason: input.reason ?? null,
    note,
    path: input.databasePath,
    now: input.now,
  })
}

export const getXInboxItem = (input: {
  accountHandle: string
  postId: string
  databasePath?: string
}) => {
  const item = getInboxRecord({
    accountHandle: normalizeXHandle(input.accountHandle),
    postId: input.postId.trim(),
    path: input.databasePath,
  })
  if (!item) throw new Error('x_inbox_item_not_found')
  return item
}

export const updateXInboxItem = (input: {
  accountHandle: string
  postId: string
  action: XInboxStateAction
  databasePath?: string
}) =>
  updateInboxStateRecord({
    accountHandle: normalizeXHandle(input.accountHandle),
    postId: input.postId.trim(),
    action: input.action,
    path: input.databasePath,
  })
