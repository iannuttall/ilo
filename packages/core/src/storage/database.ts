import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import { iloDatabasePath } from './paths.js'

export type DraftStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'

export type Draft = {
  id: string
  body: string
  status: DraftStatus
  scheduledAt: number | null
  createdAt: number
  updatedAt: number
  publishedPostId: string | null
  publishedUrl: string | null
  lastError: string | null
}

type DraftRow = {
  id: string
  body: string
  status: DraftStatus
  scheduled_at: number | null
  created_at: number
  updated_at: number
  published_post_id: string | null
  published_url: string | null
  last_error: string | null
}

const mapDraft = (row: DraftRow): Draft => ({
  id: row.id,
  body: row.body,
  status: row.status,
  scheduledAt: row.scheduled_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  publishedPostId: row.published_post_id,
  publishedUrl: row.published_url,
  lastError: row.last_error,
})

export const openDatabase = (path = iloDatabasePath()): Database.Database => {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      body TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft','scheduled','publishing','published','failed')),
      scheduled_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      published_post_id TEXT,
      published_url TEXT,
      last_error TEXT
    );
    CREATE INDEX IF NOT EXISTS drafts_due_idx ON drafts(status, scheduled_at);
    CREATE TABLE IF NOT EXISTS publish_attempts (
      id TEXT PRIMARY KEY,
      draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
      attempted_at INTEGER NOT NULL,
      ok INTEGER NOT NULL,
      provider_post_id TEXT,
      error TEXT
    );
  `)
  return db
}

export const createDraftRecord = (body: string, path?: string): Draft => {
  const db = openDatabase(path)
  try {
    const now = Date.now()
    const row: DraftRow = {
      id: randomUUID(),
      body,
      status: 'draft',
      scheduled_at: null,
      created_at: now,
      updated_at: now,
      published_post_id: null,
      published_url: null,
      last_error: null,
    }
    db.prepare(`INSERT INTO drafts (id, body, status, scheduled_at, created_at, updated_at)
      VALUES (@id, @body, @status, @scheduled_at, @created_at, @updated_at)`).run(
      row,
    )
    return mapDraft(row)
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
    ).map(mapDraft)
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
    return mapDraft(row)
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
    return mapDraft(row)
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
      return mapDraft({
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
          mapDraft({
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
      db.prepare(`INSERT INTO publish_attempts (id, draft_id, attempted_at, ok, provider_post_id, error)
        VALUES (?, ?, ?, ?, ?, ?)`).run(
        randomUUID(),
        input.id,
        now,
        input.ok ? 1 : 0,
        input.providerPostId ?? null,
        input.error ?? null,
      )
    })()
  } finally {
    db.close()
  }
}
