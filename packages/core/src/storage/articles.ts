import { randomUUID } from 'node:crypto'
import type { FxTwitterStatus } from '../providers/x/fxtwitter.js'
import { openDatabase } from './database.js'
import type Database from './sqlite.js'

export type XArticleMonitor = {
  id: string
  accountHandle: string
  sourceHandle: string
  enabled: boolean
  newestPostId: string | null
  cursor: string | null
  historyComplete: boolean
  createdAt: number
  updatedAt: number
  lastCheckedAt: number | null
  lastError: string | null
}

export type XArticle = {
  articleId: string
  postId: string
  url: string
  title: string
  previewText: string
  bodyText: string
  coverImageUrl: string | null
  createdAt: number
  modifiedAt: number | null
  postCreatedAt: number
  author: {
    id: string
    handle: string
    name: string
    bio: string
    avatarUrl: string | null
    followers: number | null
    verified: boolean
    verificationType: string | null
  }
  monitors: Array<{ id: string; sourceHandle: string }>
  firstSeenAt: number
  lastSeenAt: number
  providerData: FxTwitterStatus | null
}

export type StoredXArticle = Omit<XArticle, 'monitors' | 'providerData'> & {
  providerDataJson: string
}

type ArticleMonitorRow = {
  id: string
  account_handle: string
  source_handle: string
  enabled: number
  newest_post_id: string | null
  cursor: string | null
  history_complete: number
  created_at: number
  updated_at: number
  last_checked_at: number | null
  last_error: string | null
}

type ArticleRow = {
  article_id: string
  post_id: string
  url: string
  title: string
  preview_text: string
  body_text: string
  cover_image_url: string | null
  article_created_at: number
  article_modified_at: number | null
  post_created_at: number
  author_id: string
  author_handle: string
  author_name: string
  author_bio: string
  author_avatar_url: string | null
  author_followers: number | null
  author_verified: number
  author_verification_type: string | null
  raw_json: string
  first_seen_at: number
  last_seen_at: number
  monitors_json: string
}

const mapMonitor = (row: ArticleMonitorRow): XArticleMonitor => ({
  id: row.id,
  accountHandle: row.account_handle,
  sourceHandle: row.source_handle,
  enabled: Boolean(row.enabled),
  newestPostId: row.newest_post_id,
  cursor: row.cursor,
  historyComplete: Boolean(row.history_complete),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastCheckedAt: row.last_checked_at,
  lastError: row.last_error,
})

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

const mapArticle = (row: ArticleRow): XArticle => ({
  articleId: row.article_id,
  postId: row.post_id,
  url: row.url,
  title: row.title,
  previewText: row.preview_text,
  bodyText: row.body_text,
  coverImageUrl: row.cover_image_url,
  createdAt: row.article_created_at,
  modifiedAt: row.article_modified_at,
  postCreatedAt: row.post_created_at,
  author: {
    id: row.author_id,
    handle: row.author_handle,
    name: row.author_name,
    bio: row.author_bio,
    avatarUrl: row.author_avatar_url,
    followers: row.author_followers,
    verified: Boolean(row.author_verified),
    verificationType: row.author_verification_type,
  },
  monitors: JSON.parse(row.monitors_json) as XArticle['monitors'],
  firstSeenAt: row.first_seen_at,
  lastSeenAt: row.last_seen_at,
  providerData: parseProviderData(row.raw_json),
})

export const ensureArticleSchema = (db: Database) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS x_article_monitors (
      id TEXT PRIMARY KEY,
      account_handle TEXT NOT NULL COLLATE NOCASE,
      source_handle TEXT NOT NULL COLLATE NOCASE,
      enabled INTEGER NOT NULL DEFAULT 1,
      newest_post_id TEXT,
      cursor TEXT,
      history_complete INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_checked_at INTEGER,
      last_error TEXT,
      UNIQUE (account_handle, source_handle)
    );
    CREATE INDEX IF NOT EXISTS x_article_monitors_account_idx
      ON x_article_monitors(account_handle, enabled);
    CREATE TABLE IF NOT EXISTS x_articles (
      article_id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      preview_text TEXT NOT NULL,
      body_text TEXT NOT NULL,
      cover_image_url TEXT,
      article_created_at INTEGER NOT NULL,
      article_modified_at INTEGER,
      post_created_at INTEGER NOT NULL,
      author_id TEXT NOT NULL,
      author_handle TEXT NOT NULL COLLATE NOCASE,
      author_name TEXT NOT NULL,
      author_bio TEXT NOT NULL,
      author_avatar_url TEXT,
      author_followers INTEGER,
      author_verified INTEGER NOT NULL,
      author_verification_type TEXT,
      raw_json TEXT NOT NULL,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS x_articles_author_idx
      ON x_articles(author_handle, article_created_at DESC);
    CREATE INDEX IF NOT EXISTS x_articles_created_idx
      ON x_articles(article_created_at DESC);
    CREATE TABLE IF NOT EXISTS x_article_monitor_matches (
      monitor_id TEXT NOT NULL REFERENCES x_article_monitors(id) ON DELETE CASCADE,
      article_id TEXT NOT NULL REFERENCES x_articles(article_id) ON DELETE CASCADE,
      first_seen_at INTEGER NOT NULL,
      PRIMARY KEY (monitor_id, article_id)
    );
    CREATE INDEX IF NOT EXISTS x_article_matches_article_idx
      ON x_article_monitor_matches(article_id);
    CREATE VIRTUAL TABLE IF NOT EXISTS x_articles_fts USING fts5(
      article_id UNINDEXED,
      title,
      preview_text,
      body_text,
      author_handle,
      author_name,
      tokenize = 'unicode61 remove_diacritics 2'
    );
  `)
}

export const createArticleMonitorRecord = (input: {
  accountHandle: string
  sourceHandle: string
  path?: string
  now?: number
}): XArticleMonitor => {
  const db = openDatabase(input.path)
  try {
    ensureArticleSchema(db)
    const id = randomUUID()
    const now = input.now ?? Date.now()
    db.prepare(
      `INSERT INTO x_article_monitors (
        id, account_handle, source_handle, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, 1, ?, ?)`,
    ).run(id, input.accountHandle, input.sourceHandle, now, now)
    return mapMonitor(
      db
        .prepare('SELECT * FROM x_article_monitors WHERE id = ?')
        .get(id) as ArticleMonitorRow,
    )
  } finally {
    db.close()
  }
}

export const listArticleMonitorRecords = (
  input: {
    accountHandle?: string
    includeDisabled?: boolean
    path?: string
  } = {},
): XArticleMonitor[] => {
  const db = openDatabase(input.path)
  try {
    ensureArticleSchema(db)
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
          `SELECT * FROM x_article_monitors ${where}
           ORDER BY created_at ASC, source_handle ASC`,
        )
        .all(...values) as ArticleMonitorRow[]
    ).map(mapMonitor)
  } finally {
    db.close()
  }
}

export const getArticleMonitorRecord = (
  id: string,
  path?: string,
): XArticleMonitor | null => {
  const db = openDatabase(path)
  try {
    ensureArticleSchema(db)
    const row = db
      .prepare('SELECT * FROM x_article_monitors WHERE id = ?')
      .get(id) as ArticleMonitorRow | undefined
    return row ? mapMonitor(row) : null
  } finally {
    db.close()
  }
}

export const setArticleMonitorEnabledRecord = (input: {
  id: string
  enabled: boolean
  path?: string
  now?: number
}): XArticleMonitor => {
  const db = openDatabase(input.path)
  try {
    ensureArticleSchema(db)
    const result = db
      .prepare(
        'UPDATE x_article_monitors SET enabled = ?, updated_at = ? WHERE id = ?',
      )
      .run(input.enabled ? 1 : 0, input.now ?? Date.now(), input.id)
    if (result.changes !== 1) throw new Error('x_article_monitor_not_found')
    return mapMonitor(
      db
        .prepare('SELECT * FROM x_article_monitors WHERE id = ?')
        .get(input.id) as ArticleMonitorRow,
    )
  } finally {
    db.close()
  }
}

export const deleteArticleMonitorRecord = (id: string, path?: string) => {
  const db = openDatabase(path)
  try {
    ensureArticleSchema(db)
    db.transaction(() => {
      const result = db
        .prepare('DELETE FROM x_article_monitors WHERE id = ?')
        .run(id)
      if (result.changes !== 1) throw new Error('x_article_monitor_not_found')
      db.prepare(
        `DELETE FROM x_articles_fts WHERE article_id IN (
          SELECT a.article_id
          FROM x_articles a
          LEFT JOIN x_article_monitor_matches mm
            ON mm.article_id = a.article_id
          WHERE mm.article_id IS NULL
        )`,
      ).run()
      db.prepare(
        `DELETE FROM x_articles WHERE article_id IN (
          SELECT a.article_id
          FROM x_articles a
          LEFT JOIN x_article_monitor_matches mm
            ON mm.article_id = a.article_id
          WHERE mm.article_id IS NULL
        )`,
      ).run()
    })()
  } finally {
    db.close()
  }
}

export const storeArticleRecords = (input: {
  monitorId: string
  articles: StoredXArticle[]
  path?: string
  now?: number
}) => {
  const db = openDatabase(input.path)
  try {
    ensureArticleSchema(db)
    const now = input.now ?? Date.now()
    let newArticles = 0
    db.transaction(() => {
      const monitor = db
        .prepare('SELECT id FROM x_article_monitors WHERE id = ?')
        .get(input.monitorId)
      if (!monitor) throw new Error('x_article_monitor_not_found')

      const insertArticle = db.prepare(`INSERT OR IGNORE INTO x_articles (
          article_id, post_id, url, title, preview_text, body_text,
          cover_image_url, article_created_at, article_modified_at,
          post_created_at, author_id, author_handle, author_name, author_bio,
          author_avatar_url, author_followers, author_verified,
          author_verification_type, raw_json, first_seen_at, last_seen_at
        ) VALUES (
          @articleId, @postId, @url, @title, @previewText, @bodyText,
          @coverImageUrl, @createdAt, @modifiedAt, @postCreatedAt, @authorId,
          @authorHandle, @authorName, @authorBio, @authorAvatarUrl,
          @authorFollowers, @authorVerified, @authorVerificationType,
          @providerDataJson, @firstSeenAt, @lastSeenAt
        )`)
      const updateArticle = db.prepare(`UPDATE x_articles SET
          post_id = @postId, url = @url, title = @title,
          preview_text = @previewText, body_text = @bodyText,
          cover_image_url = @coverImageUrl,
          article_created_at = @createdAt,
          article_modified_at = @modifiedAt,
          post_created_at = @postCreatedAt, author_id = @authorId,
          author_handle = @authorHandle, author_name = @authorName,
          author_bio = @authorBio, author_avatar_url = @authorAvatarUrl,
          author_followers = @authorFollowers,
          author_verified = @authorVerified,
          author_verification_type = @authorVerificationType,
          raw_json = @providerDataJson, last_seen_at = @lastSeenAt
        WHERE article_id = @articleId`)
      const removeFts = db.prepare(
        'DELETE FROM x_articles_fts WHERE article_id = ?',
      )
      const addFts = db.prepare(`INSERT INTO x_articles_fts (
          article_id, title, preview_text, body_text, author_handle, author_name
        ) VALUES (?, ?, ?, ?, ?, ?)`)
      const addMatch = db.prepare(
        `INSERT OR IGNORE INTO x_article_monitor_matches (
          monitor_id, article_id, first_seen_at
        ) VALUES (?, ?, ?)`,
      )

      for (const article of input.articles) {
        const values = {
          ...article,
          authorId: article.author.id,
          authorHandle: article.author.handle,
          authorName: article.author.name,
          authorBio: article.author.bio,
          authorAvatarUrl: article.author.avatarUrl,
          authorFollowers: article.author.followers,
          authorVerified: article.author.verified ? 1 : 0,
          authorVerificationType: article.author.verificationType,
          firstSeenAt: article.firstSeenAt || now,
          lastSeenAt: now,
        }
        insertArticle.run(values)
        updateArticle.run(values)
        removeFts.run(article.articleId)
        addFts.run(
          article.articleId,
          article.title,
          article.previewText,
          article.bodyText,
          article.author.handle,
          article.author.name,
        )
        newArticles += Number(
          addMatch.run(input.monitorId, article.articleId, now).changes,
        )
      }
    })()
    return { newArticles }
  } finally {
    db.close()
  }
}

export const finishArticleMonitorRefreshRecord = (input: {
  id: string
  newestPostId: string | null
  cursor: string | null
  historyComplete: boolean
  path?: string
  now?: number
}) => {
  const db = openDatabase(input.path)
  try {
    ensureArticleSchema(db)
    const now = input.now ?? Date.now()
    const result = db
      .prepare(
        `UPDATE x_article_monitors
         SET newest_post_id = COALESCE(?, newest_post_id),
             cursor = ?, history_complete = ?, last_checked_at = ?,
             updated_at = ?, last_error = NULL
         WHERE id = ?`,
      )
      .run(
        input.newestPostId,
        input.cursor,
        input.historyComplete ? 1 : 0,
        now,
        now,
        input.id,
      )
    if (result.changes !== 1) throw new Error('x_article_monitor_not_found')
  } finally {
    db.close()
  }
}

export const failArticleMonitorRefreshRecord = (input: {
  id: string
  error: string
  path?: string
  now?: number
}) => {
  const db = openDatabase(input.path)
  try {
    ensureArticleSchema(db)
    const now = input.now ?? Date.now()
    db.prepare(
      `UPDATE x_article_monitors
       SET last_checked_at = ?, updated_at = ?, last_error = ?
       WHERE id = ?`,
    ).run(now, now, input.error, input.id)
  } finally {
    db.close()
  }
}

export const listArticleRecords = (input: {
  accountHandle: string
  monitorId?: string
  authorHandle?: string
  identifier?: string
  ftsQuery?: string
  limit?: number
  path?: string
}): XArticle[] => {
  const db = openDatabase(input.path)
  try {
    ensureArticleSchema(db)
    const conditions = ['m.account_handle = ? COLLATE NOCASE']
    const values: unknown[] = [input.accountHandle]
    if (input.monitorId) {
      conditions.push('m.id = ?')
      values.push(input.monitorId)
    }
    if (input.authorHandle) {
      conditions.push('a.author_handle = ? COLLATE NOCASE')
      values.push(input.authorHandle)
    }
    if (input.identifier) {
      conditions.push('(a.post_id = ? OR a.article_id = ?)')
      values.push(input.identifier, input.identifier)
    }
    if (input.ftsQuery) {
      conditions.push('x_articles_fts MATCH ?')
      values.push(input.ftsQuery)
    }
    let limit = ''
    if (input.limit !== undefined) {
      limit = 'LIMIT ?'
      values.push(input.limit)
    }
    const rows = db
      .prepare(
        `SELECT
          a.*,
          json_group_array(json_object(
            'id', m.id,
            'sourceHandle', m.source_handle
          )) AS monitors_json
        FROM x_articles a
        JOIN x_article_monitor_matches mm ON mm.article_id = a.article_id
        JOIN x_article_monitors m ON m.id = mm.monitor_id
        ${input.ftsQuery ? 'JOIN x_articles_fts ON x_articles_fts.article_id = a.article_id' : ''}
        WHERE ${conditions.join(' AND ')}
        GROUP BY a.article_id
        ORDER BY a.article_created_at DESC, a.post_id DESC
        ${limit}`,
      )
      .all(...values) as ArticleRow[]
    return rows.map(mapArticle)
  } finally {
    db.close()
  }
}
