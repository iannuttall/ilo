import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { FxTwitterStatus } from '../providers/x/fxtwitter.js'
import { openDatabase } from './database.js'
import { ensureFollowerSchema } from './followers.js'
import { ensureFollowingSchema } from './following.js'

export type XMonitor = {
  id: string
  accountHandle: string
  name: string
  query: string
  enabled: boolean
  newestPostId: string | null
  createdAt: number
  updatedAt: number
  lastCheckedAt: number | null
  lastError: string | null
}

export type XInboxStatus =
  | 'active'
  | 'unread'
  | 'read'
  | 'archived'
  | 'replied'
  | 'all'

export type XInboxStateAction =
  | 'read'
  | 'unread'
  | 'archive'
  | 'restore'
  | 'replied'
  | 'unreplied'

export type XInboxItem = {
  postId: string
  url: string
  text: string
  createdAt: number
  language: string | null
  likes: number
  reposts: number
  quotes: number
  replies: number
  views: number | null
  bookmarks: number | null
  replyingToPostId: string | null
  author: {
    id: string
    handle: string
    name: string
    bio: string
    avatarUrl: string | null
    followers: number | null
    following: number | null
    verified: boolean
    verificationType: string | null
  }
  relationship: {
    followsMe: boolean | null
    iFollow: boolean | null
    followerIndexComplete: boolean | null
    followingIndexComplete: boolean | null
  }
  state: {
    readAt: number | null
    archivedAt: number | null
    repliedAt: number | null
  }
  monitors: Array<{ id: string; name: string; query: string }>
  firstSeenAt: number
  lastSeenAt: number
  providerData: FxTwitterStatus | null
}

type MonitorRow = {
  id: string
  account_handle: string
  name: string
  query: string
  enabled: number
  newest_post_id: string | null
  created_at: number
  updated_at: number
  last_checked_at: number | null
  last_error: string | null
}

type InboxRow = {
  post_id: string
  url: string
  text: string
  created_at: number
  language: string | null
  likes: number
  reposts: number
  quotes: number
  replies: number
  views: number | null
  bookmarks: number | null
  replying_to_post_id: string | null
  author_id: string
  author_handle: string
  author_name: string
  author_bio: string
  author_avatar_url: string | null
  author_followers: number | null
  author_following: number | null
  author_verified: number
  author_verification_type: string | null
  raw_json: string
  first_seen_at: number
  last_seen_at: number
  read_at: number | null
  archived_at: number | null
  replied_at: number | null
  follows_me: number | null
  i_follow: number | null
  follower_index_complete: number | null
  following_index_complete: number | null
  monitors_json: string
}

export type StoredInboxPost = Omit<
  XInboxItem,
  'relationship' | 'state' | 'monitors' | 'providerData'
> & {
  providerDataJson: string
}

const mapMonitor = (row: MonitorRow): XMonitor => ({
  id: row.id,
  accountHandle: row.account_handle,
  name: row.name,
  query: row.query,
  enabled: Boolean(row.enabled),
  newestPostId: row.newest_post_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastCheckedAt: row.last_checked_at,
  lastError: row.last_error,
})

const nullableBoolean = (value: number | null): boolean | null =>
  value === null ? null : Boolean(value)

const parseProviderData = (value: string): FxTwitterStatus | null => {
  try {
    const data = JSON.parse(value) as unknown
    return data && typeof data === 'object' && 'id' in data
      ? (data as FxTwitterStatus)
      : null
  } catch {
    return null
  }
}

const mapInboxItem = (row: InboxRow): XInboxItem => ({
  postId: row.post_id,
  url: row.url,
  text: row.text,
  createdAt: row.created_at,
  language: row.language,
  likes: row.likes,
  reposts: row.reposts,
  quotes: row.quotes,
  replies: row.replies,
  views: row.views,
  bookmarks: row.bookmarks,
  replyingToPostId: row.replying_to_post_id,
  author: {
    id: row.author_id,
    handle: row.author_handle,
    name: row.author_name,
    bio: row.author_bio,
    avatarUrl: row.author_avatar_url,
    followers: row.author_followers,
    following: row.author_following,
    verified: Boolean(row.author_verified),
    verificationType: row.author_verification_type,
  },
  relationship: {
    followsMe: nullableBoolean(row.follows_me),
    iFollow: nullableBoolean(row.i_follow),
    followerIndexComplete: nullableBoolean(row.follower_index_complete),
    followingIndexComplete: nullableBoolean(row.following_index_complete),
  },
  state: {
    readAt: row.read_at,
    archivedAt: row.archived_at,
    repliedAt: row.replied_at,
  },
  monitors: JSON.parse(row.monitors_json) as XInboxItem['monitors'],
  firstSeenAt: row.first_seen_at,
  lastSeenAt: row.last_seen_at,
  providerData: parseProviderData(row.raw_json),
})

export const ensureInboxSchema = (db: Database.Database) => {
  ensureFollowerSchema(db)
  ensureFollowingSchema(db)
  db.exec(`
    CREATE TABLE IF NOT EXISTS x_monitors (
      id TEXT PRIMARY KEY,
      account_handle TEXT NOT NULL COLLATE NOCASE,
      name TEXT NOT NULL COLLATE NOCASE,
      query TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      newest_post_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_checked_at INTEGER,
      last_error TEXT,
      UNIQUE (account_handle, name)
    );
    CREATE INDEX IF NOT EXISTS x_monitors_account_idx
      ON x_monitors(account_handle, enabled);
    CREATE TABLE IF NOT EXISTS x_inbox_posts (
      post_id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      language TEXT,
      likes INTEGER NOT NULL,
      reposts INTEGER NOT NULL,
      quotes INTEGER NOT NULL,
      replies INTEGER NOT NULL,
      views INTEGER,
      bookmarks INTEGER,
      replying_to_post_id TEXT,
      author_id TEXT NOT NULL,
      author_handle TEXT NOT NULL COLLATE NOCASE,
      author_name TEXT NOT NULL,
      author_bio TEXT NOT NULL,
      author_avatar_url TEXT,
      author_followers INTEGER,
      author_following INTEGER,
      author_verified INTEGER NOT NULL,
      author_verification_type TEXT,
      raw_json TEXT NOT NULL,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS x_inbox_posts_created_idx
      ON x_inbox_posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS x_inbox_posts_author_idx
      ON x_inbox_posts(author_id);
    CREATE TABLE IF NOT EXISTS x_monitor_matches (
      monitor_id TEXT NOT NULL REFERENCES x_monitors(id) ON DELETE CASCADE,
      post_id TEXT NOT NULL REFERENCES x_inbox_posts(post_id) ON DELETE CASCADE,
      first_seen_at INTEGER NOT NULL,
      PRIMARY KEY (monitor_id, post_id)
    );
    CREATE INDEX IF NOT EXISTS x_monitor_matches_post_idx
      ON x_monitor_matches(post_id);
    CREATE TABLE IF NOT EXISTS x_inbox_states (
      account_handle TEXT NOT NULL COLLATE NOCASE,
      post_id TEXT NOT NULL REFERENCES x_inbox_posts(post_id) ON DELETE CASCADE,
      read_at INTEGER,
      archived_at INTEGER,
      replied_at INTEGER,
      PRIMARY KEY (account_handle, post_id)
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS x_inbox_posts_fts USING fts5(
      post_id UNINDEXED,
      text,
      author_handle,
      author_name,
      author_bio,
      tokenize = 'unicode61 remove_diacritics 2'
    );
  `)
}

export const createMonitorRecord = (input: {
  accountHandle: string
  name: string
  query: string
  path?: string
  now?: number
}): XMonitor => {
  const db = openDatabase(input.path)
  try {
    ensureInboxSchema(db)
    const now = input.now ?? Date.now()
    const id = randomUUID()
    db.prepare(
      `INSERT INTO x_monitors (
        id, account_handle, name, query, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, ?, ?)`,
    ).run(id, input.accountHandle, input.name, input.query, now, now)
    return mapMonitor(
      db.prepare('SELECT * FROM x_monitors WHERE id = ?').get(id) as MonitorRow,
    )
  } finally {
    db.close()
  }
}

export const listMonitorRecords = (
  input: {
    accountHandle?: string
    includeDisabled?: boolean
    path?: string
  } = {},
): XMonitor[] => {
  const db = openDatabase(input.path)
  try {
    ensureInboxSchema(db)
    const conditions: string[] = []
    const values: unknown[] = []
    if (input.accountHandle) {
      conditions.push('account_handle = ? COLLATE NOCASE')
      values.push(input.accountHandle)
    }
    if (!input.includeDisabled) conditions.push('enabled = 1')
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    return (
      db
        .prepare(
          `SELECT * FROM x_monitors ${where} ORDER BY created_at ASC, name ASC`,
        )
        .all(...values) as MonitorRow[]
    ).map(mapMonitor)
  } finally {
    db.close()
  }
}

export const getMonitorRecord = (
  id: string,
  path?: string,
): XMonitor | null => {
  const db = openDatabase(path)
  try {
    ensureInboxSchema(db)
    const row = db.prepare('SELECT * FROM x_monitors WHERE id = ?').get(id) as
      | MonitorRow
      | undefined
    return row ? mapMonitor(row) : null
  } finally {
    db.close()
  }
}

export const setMonitorEnabledRecord = (input: {
  id: string
  enabled: boolean
  path?: string
  now?: number
}): XMonitor => {
  const db = openDatabase(input.path)
  try {
    ensureInboxSchema(db)
    const result = db
      .prepare('UPDATE x_monitors SET enabled = ?, updated_at = ? WHERE id = ?')
      .run(input.enabled ? 1 : 0, input.now ?? Date.now(), input.id)
    if (result.changes !== 1) throw new Error('x_monitor_not_found')
    return mapMonitor(
      db
        .prepare('SELECT * FROM x_monitors WHERE id = ?')
        .get(input.id) as MonitorRow,
    )
  } finally {
    db.close()
  }
}

export const deleteMonitorRecord = (id: string, path?: string) => {
  const db = openDatabase(path)
  try {
    ensureInboxSchema(db)
    const result = db.prepare('DELETE FROM x_monitors WHERE id = ?').run(id)
    if (result.changes !== 1) throw new Error('x_monitor_not_found')
  } finally {
    db.close()
  }
}

export const storeMonitorPosts = (input: {
  monitorId: string
  posts: StoredInboxPost[]
  path?: string
  now?: number
}) => {
  const db = openDatabase(input.path)
  try {
    ensureInboxSchema(db)
    const now = input.now ?? Date.now()
    let newItems = 0
    let newMatches = 0
    db.transaction(() => {
      const monitor = db
        .prepare('SELECT account_handle FROM x_monitors WHERE id = ?')
        .get(input.monitorId) as { account_handle: string } | undefined
      if (!monitor) throw new Error('x_monitor_not_found')

      const insertPost = db.prepare(`INSERT OR IGNORE INTO x_inbox_posts (
          post_id, url, text, created_at, language, likes, reposts, quotes,
          replies, views, bookmarks, replying_to_post_id, author_id,
          author_handle, author_name, author_bio, author_avatar_url,
          author_followers, author_following, author_verified,
          author_verification_type, raw_json, first_seen_at, last_seen_at
        ) VALUES (
          @postId, @url, @text, @createdAt, @language, @likes, @reposts, @quotes,
          @replies, @views, @bookmarks, @replyingToPostId, @authorId,
          @authorHandle, @authorName, @authorBio, @authorAvatarUrl,
          @authorFollowers, @authorFollowing, @authorVerified,
          @authorVerificationType, @providerDataJson, @firstSeenAt, @lastSeenAt
        )`)
      const updatePost = db.prepare(`UPDATE x_inbox_posts SET
          url = @url, text = @text, created_at = @createdAt,
          language = @language, likes = @likes, reposts = @reposts,
          quotes = @quotes, replies = @replies, views = @views,
          bookmarks = @bookmarks, replying_to_post_id = @replyingToPostId,
          author_id = @authorId, author_handle = @authorHandle,
          author_name = @authorName, author_bio = @authorBio,
          author_avatar_url = @authorAvatarUrl,
          author_followers = @authorFollowers,
          author_following = @authorFollowing,
          author_verified = @authorVerified,
          author_verification_type = @authorVerificationType,
          raw_json = @providerDataJson, last_seen_at = @lastSeenAt
        WHERE post_id = @postId`)
      const removeFts = db.prepare(
        'DELETE FROM x_inbox_posts_fts WHERE post_id = ?',
      )
      const addFts = db.prepare(`INSERT INTO x_inbox_posts_fts (
          post_id, text, author_handle, author_name, author_bio
        ) VALUES (?, ?, ?, ?, ?)`)
      const addMatch = db.prepare(
        `INSERT OR IGNORE INTO x_monitor_matches (monitor_id, post_id, first_seen_at)
         VALUES (?, ?, ?)`,
      )
      const addState = db.prepare(
        `INSERT OR IGNORE INTO x_inbox_states (account_handle, post_id)
         VALUES (?, ?)`,
      )

      for (const post of input.posts) {
        const values = {
          ...post,
          authorId: post.author.id,
          authorHandle: post.author.handle,
          authorName: post.author.name,
          authorBio: post.author.bio,
          authorAvatarUrl: post.author.avatarUrl,
          authorFollowers: post.author.followers,
          authorFollowing: post.author.following,
          authorVerified: post.author.verified ? 1 : 0,
          authorVerificationType: post.author.verificationType,
          firstSeenAt: post.firstSeenAt || now,
          lastSeenAt: now,
        }
        newItems += Number(insertPost.run(values).changes)
        updatePost.run(values)
        removeFts.run(post.postId)
        addFts.run(
          post.postId,
          post.text,
          post.author.handle,
          post.author.name,
          post.author.bio,
        )
        newMatches += Number(
          addMatch.run(input.monitorId, post.postId, now).changes,
        )
        addState.run(monitor.account_handle, post.postId)
      }
    })()
    return { newItems, newMatches }
  } finally {
    db.close()
  }
}

export const finishMonitorRefreshRecord = (input: {
  id: string
  newestPostId: string | null
  path?: string
  now?: number
}) => {
  const db = openDatabase(input.path)
  try {
    ensureInboxSchema(db)
    const result = db
      .prepare(
        `UPDATE x_monitors SET newest_post_id = COALESCE(?, newest_post_id),
         last_checked_at = ?, updated_at = ?, last_error = NULL WHERE id = ?`,
      )
      .run(
        input.newestPostId,
        input.now ?? Date.now(),
        input.now ?? Date.now(),
        input.id,
      )
    if (result.changes !== 1) throw new Error('x_monitor_not_found')
  } finally {
    db.close()
  }
}

export const failMonitorRefreshRecord = (input: {
  id: string
  error: string
  path?: string
  now?: number
}) => {
  const db = openDatabase(input.path)
  try {
    ensureInboxSchema(db)
    const now = input.now ?? Date.now()
    db.prepare(
      `UPDATE x_monitors SET last_checked_at = ?, updated_at = ?, last_error = ?
       WHERE id = ?`,
    ).run(now, now, input.error, input.id)
  } finally {
    db.close()
  }
}

export const listInboxRecords = (input: {
  accountHandle: string
  monitorId?: string
  postId?: string
  status?: XInboxStatus
  verified?: boolean
  followsMe?: boolean
  iFollow?: boolean
  ftsQuery?: string
  limit?: number
  path?: string
}): XInboxItem[] => {
  const db = openDatabase(input.path)
  try {
    ensureInboxSchema(db)
    const conditions = ['m.account_handle = ? COLLATE NOCASE']
    const values: unknown[] = [input.accountHandle]
    if (input.monitorId) {
      conditions.push('m.id = ?')
      values.push(input.monitorId)
    }
    if (input.postId) {
      conditions.push('p.post_id = ?')
      values.push(input.postId)
    }
    const status = input.status ?? 'active'
    if (status === 'active') conditions.push('s.archived_at IS NULL')
    if (status === 'unread') {
      conditions.push('s.read_at IS NULL', 's.archived_at IS NULL')
    }
    if (status === 'read') {
      conditions.push('s.read_at IS NOT NULL', 's.archived_at IS NULL')
    }
    if (status === 'archived') conditions.push('s.archived_at IS NOT NULL')
    if (status === 'replied') conditions.push('s.replied_at IS NOT NULL')
    if (input.verified !== undefined) {
      conditions.push('p.author_verified = ?')
      values.push(input.verified ? 1 : 0)
    }
    if (input.followsMe !== undefined) {
      conditions.push(
        input.followsMe
          ? 'fr.follower_id IS NOT NULL'
          : 'fr.follower_id IS NULL AND fs.complete = 1',
      )
    }
    if (input.iFollow !== undefined) {
      conditions.push(
        input.iFollow
          ? 'ir.followed_id IS NOT NULL'
          : 'ir.followed_id IS NULL AND follow_source.complete = 1',
      )
    }
    if (input.ftsQuery) {
      conditions.push('x_inbox_posts_fts MATCH ?')
      values.push(input.ftsQuery)
    }
    values.push(Math.min(500, Math.max(1, input.limit ?? 50)))
    const rows = db
      .prepare(
        `SELECT
          p.*,
          s.read_at,
          s.archived_at,
          s.replied_at,
          CASE
            WHEN fr.follower_id IS NOT NULL THEN 1
            WHEN fs.complete = 1 THEN 0
            ELSE NULL
          END AS follows_me,
          CASE
            WHEN ir.followed_id IS NOT NULL THEN 1
            WHEN follow_source.complete = 1 THEN 0
            ELSE NULL
          END AS i_follow,
          fs.complete AS follower_index_complete,
          follow_source.complete AS following_index_complete,
          json_group_array(json_object(
            'id', m.id,
            'name', m.name,
            'query', m.query
          )) AS monitors_json
        FROM x_inbox_posts p
        JOIN x_monitor_matches mm ON mm.post_id = p.post_id
        JOIN x_monitors m ON m.id = mm.monitor_id
        JOIN x_inbox_states s
          ON s.post_id = p.post_id
         AND s.account_handle = m.account_handle COLLATE NOCASE
        ${input.ftsQuery ? 'JOIN x_inbox_posts_fts ON x_inbox_posts_fts.post_id = p.post_id' : ''}
        LEFT JOIN x_follower_sources fs
          ON fs.handle = s.account_handle COLLATE NOCASE
        LEFT JOIN x_follower_relationships fr
          ON fr.subject_id = fs.subject_id
         AND fr.follower_id = p.author_id
         AND fr.last_seen_sync_id = fs.sync_id
        LEFT JOIN x_following_sources follow_source
          ON follow_source.handle = s.account_handle COLLATE NOCASE
        LEFT JOIN x_following_relationships ir
          ON ir.subject_id = follow_source.subject_id
         AND ir.followed_id = p.author_id
         AND ir.last_seen_sync_id = follow_source.sync_id
        WHERE ${conditions.join(' AND ')}
        GROUP BY p.post_id, s.account_handle
        ORDER BY p.created_at DESC, p.post_id DESC
        LIMIT ?`,
      )
      .all(...values) as InboxRow[]
    return rows.map(mapInboxItem)
  } finally {
    db.close()
  }
}

export const getInboxRecord = (input: {
  accountHandle: string
  postId: string
  path?: string
}): XInboxItem | null =>
  listInboxRecords({
    ...input,
    status: 'all',
    limit: 1,
  }).at(0) ?? null

export const updateInboxStateRecord = (input: {
  accountHandle: string
  postId: string
  action: XInboxStateAction
  path?: string
  now?: number
}): XInboxItem => {
  const db = openDatabase(input.path)
  try {
    ensureInboxSchema(db)
    const now = input.now ?? Date.now()
    const updates: Record<XInboxStateAction, string> = {
      read: 'read_at = ?',
      unread: 'read_at = NULL',
      archive: 'archived_at = ?',
      restore: 'archived_at = NULL',
      replied: 'replied_at = ?',
      unreplied: 'replied_at = NULL',
    }
    const needsTime = ['read', 'archive', 'replied'].includes(input.action)
    const result = db
      .prepare(
        `UPDATE x_inbox_states SET ${updates[input.action]}
         WHERE account_handle = ? COLLATE NOCASE AND post_id = ?`,
      )
      .run(...(needsTime ? [now] : []), input.accountHandle, input.postId)
    if (result.changes !== 1) throw new Error('x_inbox_item_not_found')
  } finally {
    db.close()
  }
  const item = getInboxRecord(input)
  if (!item) throw new Error('x_inbox_item_not_found')
  return item
}
