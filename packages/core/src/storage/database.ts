import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { PublishingAccount, PublishingProvider } from './config.js'
import { iloDatabasePath } from './paths.js'
import Database from './sqlite.js'

export type DraftStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'

export type DraftImage = {
  path: string
  altText?: string
}

export type Draft = {
  id: string
  body: string
  replyToPostId: string | null
  images: DraftImage[]
  status: DraftStatus
  scheduledAt: number | null
  createdAt: number
  updatedAt: number
  publishedPostId: string | null
  publishedUrl: string | null
  lastError: string | null
  publishingAccount: DraftPublishingAccount | null
}

export type DraftPublishingAccount = Pick<
  PublishingAccount,
  'id' | 'provider' | 'username'
>

type DraftRow = {
  id: string
  body: string
  reply_to_post_id: string | null
  status: DraftStatus
  scheduled_at: number | null
  created_at: number
  updated_at: number
  published_post_id: string | null
  published_url: string | null
  last_error: string | null
  publishing_account_id: string | null
  publishing_provider: PublishingProvider | null
  publishing_username: string | null
}

type DraftImageRow = {
  path: string
  alt_text: string | null
}

export type DraftRecordOptions = {
  replyToPostId?: string
  images?: DraftImage[]
  publishingAccount?: DraftPublishingAccount
}

const mapDraft = (row: DraftRow, images: DraftImage[] = []): Draft => ({
  id: row.id,
  body: row.body,
  replyToPostId: row.reply_to_post_id,
  images,
  status: row.status,
  scheduledAt: row.scheduled_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  publishedPostId: row.published_post_id,
  publishedUrl: row.published_url,
  lastError: row.last_error,
  publishingAccount:
    row.publishing_account_id &&
    row.publishing_provider &&
    row.publishing_username
      ? {
          id: row.publishing_account_id,
          provider: row.publishing_provider,
          username: row.publishing_username,
        }
      : null,
})

const loadDraftImages = (db: Database, draftId: string): DraftImage[] =>
  (
    db
      .prepare(
        'SELECT path, alt_text FROM draft_images WHERE draft_id = ? ORDER BY position ASC',
      )
      .all(draftId) as DraftImageRow[]
  ).map((row) => ({
    path: row.path,
    ...(row.alt_text ? { altText: row.alt_text } : {}),
  }))

const readDraft = (db: Database, row: DraftRow) =>
  mapDraft(row, loadDraftImages(db, row.id))

export const openDatabase = (path = iloDatabasePath()): Database => {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      body TEXT NOT NULL,
      reply_to_post_id TEXT,
      status TEXT NOT NULL CHECK (status IN ('draft','scheduled','publishing','published','failed')),
      scheduled_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      published_post_id TEXT,
      published_url TEXT,
      last_error TEXT,
      publishing_account_id TEXT,
      publishing_provider TEXT CHECK (publishing_provider IN ('x','typefully')),
      publishing_username TEXT
    );
    CREATE INDEX IF NOT EXISTS drafts_due_idx ON drafts(status, scheduled_at);
    CREATE TABLE IF NOT EXISTS publish_attempts (
      id TEXT PRIMARY KEY,
      draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
      attempted_at INTEGER NOT NULL,
      ok INTEGER NOT NULL,
      provider_post_id TEXT,
      provider TEXT,
      publishing_account_id TEXT,
      error TEXT
    );
    CREATE TABLE IF NOT EXISTS draft_images (
      draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      path TEXT NOT NULL,
      alt_text TEXT,
      PRIMARY KEY (draft_id, position)
    );
  `)
  const draftColumns = db.prepare('PRAGMA table_info(drafts)').all() as Array<{
    name: string
  }>
  if (!draftColumns.some((column) => column.name === 'reply_to_post_id')) {
    db.exec('ALTER TABLE drafts ADD COLUMN reply_to_post_id TEXT')
  }
  const draftMigrations = [
    ['publishing_account_id', 'TEXT'],
    ['publishing_provider', 'TEXT'],
    ['publishing_username', 'TEXT'],
  ] as const
  for (const [name, definition] of draftMigrations) {
    if (!draftColumns.some((column) => column.name === name)) {
      db.exec(`ALTER TABLE drafts ADD COLUMN ${name} ${definition}`)
    }
  }
  const attemptColumns = db
    .prepare('PRAGMA table_info(publish_attempts)')
    .all() as Array<{ name: string }>
  if (!attemptColumns.some((column) => column.name === 'provider')) {
    db.exec('ALTER TABLE publish_attempts ADD COLUMN provider TEXT')
  }
  if (
    !attemptColumns.some((column) => column.name === 'publishing_account_id')
  ) {
    db.exec(
      'ALTER TABLE publish_attempts ADD COLUMN publishing_account_id TEXT',
    )
  }
  db.exec(
    'CREATE INDEX IF NOT EXISTS drafts_account_idx ON drafts(publishing_account_id, status)',
  )
  return db
}

export function createDraftRecord(body: string, path?: string): Draft
export function createDraftRecord(
  body: string,
  options?: DraftRecordOptions,
  path?: string,
): Draft
export function createDraftRecord(
  body: string,
  optionsOrPath: DraftRecordOptions | string = {},
  path?: string,
): Draft {
  const options = typeof optionsOrPath === 'string' ? {} : optionsOrPath
  const databasePath = typeof optionsOrPath === 'string' ? optionsOrPath : path
  const db = openDatabase(databasePath)
  try {
    const now = Date.now()
    const row: DraftRow = {
      id: randomUUID(),
      body,
      reply_to_post_id: options.replyToPostId ?? null,
      status: 'draft',
      scheduled_at: null,
      created_at: now,
      updated_at: now,
      published_post_id: null,
      published_url: null,
      last_error: null,
      publishing_account_id: options.publishingAccount?.id ?? null,
      publishing_provider: options.publishingAccount?.provider ?? null,
      publishing_username: options.publishingAccount?.username ?? null,
    }
    const images = options.images ?? []
    db.transaction(() => {
      db.prepare(`INSERT INTO drafts (
        id, body, reply_to_post_id, status, scheduled_at, created_at, updated_at,
        publishing_account_id, publishing_provider, publishing_username
      ) VALUES (
        @id, @body, @reply_to_post_id, @status, @scheduled_at, @created_at, @updated_at,
        @publishing_account_id, @publishing_provider, @publishing_username
      )`).run(row)
      const insertImage =
        db.prepare(`INSERT INTO draft_images (draft_id, position, path, alt_text)
        VALUES (?, ?, ?, ?)`)
      images.forEach((image, position) => {
        insertImage.run(row.id, position, image.path, image.altText ?? null)
      })
    })()
    return mapDraft(row, images)
  } finally {
    db.close()
  }
}

export const listDraftRecords = (path?: string): Draft[] => {
  const db = openDatabase(path)
  try {
    return (
      db
        .prepare('SELECT * FROM drafts ORDER BY created_at DESC')
        .all() as DraftRow[]
    ).map((row) => readDraft(db, row))
  } finally {
    db.close()
  }
}

export const getDraftRecord = (id: string, path?: string): Draft => {
  const db = openDatabase(path)
  try {
    const row = db.prepare('SELECT * FROM drafts WHERE id = ?').get(id) as
      | DraftRow
      | undefined
    if (!row) throw new Error('draft_not_found')
    return readDraft(db, row)
  } finally {
    db.close()
  }
}

export const scheduleDraftRecord = (
  id: string,
  scheduledAt: number,
  path?: string,
): Draft => {
  const db = openDatabase(path)
  try {
    const result = db
      .prepare(`UPDATE drafts SET status = 'scheduled', scheduled_at = ?, updated_at = ?, last_error = NULL
      WHERE id = ? AND status IN ('draft','scheduled','failed')`)
      .run(scheduledAt, Date.now(), id)
    if (result.changes !== 1) throw new Error('draft_not_schedulable')
    const row = db
      .prepare('SELECT * FROM drafts WHERE id = ?')
      .get(id) as DraftRow
    return readDraft(db, row)
  } finally {
    db.close()
  }
}

export const claimDraftRecord = (id: string, path?: string): Draft => {
  const db = openDatabase(path)
  try {
    const claim = db.transaction(() => {
      const row = db.prepare('SELECT * FROM drafts WHERE id = ?').get(id) as
        | DraftRow
        | undefined
      if (!row) throw new Error('draft_not_found')
      if (!['draft', 'scheduled', 'failed'].includes(row.status))
        throw new Error('draft_not_publishable')
      const now = Date.now()
      db.prepare(
        `UPDATE drafts SET status = 'publishing', updated_at = ?, last_error = NULL WHERE id = ?`,
      ).run(now, id)
      return readDraft(db, {
        ...row,
        status: 'publishing',
        updated_at: now,
        last_error: null,
      })
    })
    return claim()
  } finally {
    db.close()
  }
}

const publishingAccountValues = (account: DraftPublishingAccount) => [
  account.id,
  account.provider,
  account.username,
]

export const bindDraftPublishingAccountRecord = (
  id: string,
  account: DraftPublishingAccount,
  path?: string,
): Draft => {
  const db = openDatabase(path)
  try {
    const row = db.prepare('SELECT * FROM drafts WHERE id = ?').get(id) as
      | DraftRow
      | undefined
    if (!row) throw new Error('draft_not_found')
    if (row.publishing_account_id && row.publishing_account_id !== account.id) {
      throw new Error('draft_publishing_account_mismatch')
    }
    if (!row.publishing_account_id) {
      db.prepare(`UPDATE drafts
        SET publishing_account_id = ?, publishing_provider = ?, publishing_username = ?, updated_at = ?
        WHERE id = ? AND publishing_account_id IS NULL`).run(
        ...publishingAccountValues(account),
        Date.now(),
        id,
      )
    }
    const updated = db.prepare('SELECT * FROM drafts WHERE id = ?').get(id) as
      | DraftRow
      | undefined
    if (!updated) throw new Error('draft_not_found')
    return readDraft(db, updated)
  } finally {
    db.close()
  }
}

export const bindUnassignedDraftRecords = (
  account: DraftPublishingAccount,
  path?: string,
) => {
  const db = openDatabase(path)
  try {
    return db
      .prepare(`UPDATE drafts
        SET publishing_account_id = ?, publishing_provider = ?, publishing_username = ?, updated_at = ?
        WHERE publishing_account_id IS NULL AND status IN ('draft','scheduled','failed')`)
      .run(...publishingAccountValues(account), Date.now()).changes
  } finally {
    db.close()
  }
}

export const releaseDraftsForPublishingAccountRecord = (
  accountId: string,
  path?: string,
) => {
  const db = openDatabase(path)
  try {
    const scheduled = db
      .prepare(`SELECT COUNT(*) AS count FROM drafts
        WHERE publishing_account_id = ? AND status IN ('scheduled','publishing')`)
      .get(accountId) as { count: number }
    if (scheduled.count > 0) {
      throw new Error('publishing_account_has_scheduled_drafts')
    }
    return db
      .prepare(`UPDATE drafts
        SET publishing_account_id = NULL, publishing_provider = NULL, publishing_username = NULL, updated_at = ?
        WHERE publishing_account_id = ? AND status IN ('draft','failed')`)
      .run(Date.now(), accountId).changes
  } finally {
    db.close()
  }
}

export const claimDueDraftRecords = (
  now = Date.now(),
  limit = 20,
  path?: string,
): Draft[] => {
  const db = openDatabase(path)
  try {
    const claim = db.transaction(() => {
      const rows = db
        .prepare(`SELECT * FROM drafts WHERE status = 'scheduled' AND scheduled_at <= ?
        ORDER BY scheduled_at ASC LIMIT ?`)
        .all(now, limit) as DraftRow[]
      const update =
        db.prepare(`UPDATE drafts SET status = 'publishing', updated_at = ?, last_error = NULL
        WHERE id = ? AND status = 'scheduled'`)
      return rows
        .filter((row) => update.run(now, row.id).changes === 1)
        .map((row) =>
          readDraft(db, {
            ...row,
            status: 'publishing',
            updated_at: now,
            last_error: null,
          }),
        )
    })
    return claim()
  } finally {
    db.close()
  }
}

export const finishDraftPublish = (input: {
  id: string
  ok: boolean
  providerPostId?: string
  providerUrl?: string
  provider?: PublishingProvider
  publishingAccountId?: string
  error?: string
  path?: string
}) => {
  const db = openDatabase(input.path)
  try {
    const now = Date.now()
    db.transaction(() => {
      db.prepare(`UPDATE drafts SET status = ?, updated_at = ?, published_post_id = ?, published_url = ?, last_error = ?
        WHERE id = ? AND status = 'publishing'`).run(
        input.ok ? 'published' : 'failed',
        now,
        input.providerPostId ?? null,
        input.providerUrl ?? null,
        input.error ?? null,
        input.id,
      )
      db.prepare(`INSERT INTO publish_attempts (
        id, draft_id, attempted_at, ok, provider_post_id, provider,
        publishing_account_id, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        randomUUID(),
        input.id,
        now,
        input.ok ? 1 : 0,
        input.providerPostId ?? null,
        input.provider ?? null,
        input.publishingAccountId ?? null,
        input.error ?? null,
      )
    })()
  } finally {
    db.close()
  }
}
