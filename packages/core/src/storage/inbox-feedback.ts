import { openDatabase } from './database.js'
import { ensureInboxSchema } from './inbox.js'
import type Database from './sqlite.js'

export type XInboxFeedbackValue = 'useful' | 'not_useful'

export type XInboxFeedbackReason =
  | 'relevant'
  | 'original'
  | 'actionable'
  | 'primary-source'
  | 'duplicate'
  | 'promotional'
  | 'irrelevant'
  | 'wrong-language'
  | 'too-shallow'
  | 'other'

export type XInboxFeedback = {
  accountHandle: string
  postId: string
  value: XInboxFeedbackValue
  reason: XInboxFeedbackReason | null
  note: string | null
  createdAt: number
  updatedAt: number
}

export type XInboxFeedbackEvidence = XInboxFeedback & {
  authorId: string
}

type FeedbackRow = {
  account_handle: string
  post_id: string
  value: XInboxFeedbackValue
  reason: XInboxFeedbackReason | null
  note: string | null
  created_at: number
  updated_at: number
}

type FeedbackEvidenceRow = FeedbackRow & { author_id: string }

const mapFeedback = (row: FeedbackRow): XInboxFeedback => ({
  accountHandle: row.account_handle,
  postId: row.post_id,
  value: row.value,
  reason: row.reason,
  note: row.note,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const ensureInboxFeedbackSchema = (db: Database) => {
  ensureInboxSchema(db)
  db.exec(`
    CREATE TABLE IF NOT EXISTS x_inbox_feedback (
      account_handle TEXT NOT NULL COLLATE NOCASE,
      post_id TEXT NOT NULL REFERENCES x_inbox_posts(post_id) ON DELETE CASCADE,
      value TEXT NOT NULL CHECK (value IN ('useful', 'not_useful')),
      reason TEXT,
      note TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (account_handle, post_id)
    );
    CREATE INDEX IF NOT EXISTS x_inbox_feedback_account_idx
      ON x_inbox_feedback(account_handle, updated_at DESC);
  `)
}

export const listInboxFeedbackEvidenceRecords = (input: {
  accountHandle: string
  path?: string
}): XInboxFeedbackEvidence[] => {
  const db = openDatabase(input.path)
  try {
    ensureInboxFeedbackSchema(db)
    return (
      db
        .prepare(
          `SELECT f.*, p.author_id
           FROM x_inbox_feedback f
           JOIN x_inbox_posts p ON p.post_id = f.post_id
           WHERE f.account_handle = ? COLLATE NOCASE
           ORDER BY f.updated_at DESC, f.post_id DESC`,
        )
        .all(input.accountHandle) as FeedbackEvidenceRow[]
    ).map((row) => ({ ...mapFeedback(row), authorId: row.author_id }))
  } finally {
    db.close()
  }
}

export const recordInboxFeedbackRecord = (input: {
  accountHandle: string
  postId: string
  value: XInboxFeedbackValue
  reason?: XInboxFeedbackReason | null
  note?: string | null
  path?: string
  now?: number
}): XInboxFeedback => {
  const db = openDatabase(input.path)
  try {
    ensureInboxFeedbackSchema(db)
    const exists = db
      .prepare(
        `SELECT 1 FROM x_inbox_states
         WHERE account_handle = ? COLLATE NOCASE AND post_id = ?`,
      )
      .get(input.accountHandle, input.postId)
    if (!exists) throw new Error('x_inbox_item_not_found')
    const now = input.now ?? Date.now()
    db.prepare(
      `INSERT INTO x_inbox_feedback (
        account_handle, post_id, value, reason, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_handle, post_id) DO UPDATE SET
        value = excluded.value,
        reason = excluded.reason,
        note = excluded.note,
        updated_at = excluded.updated_at`,
    ).run(
      input.accountHandle,
      input.postId,
      input.value,
      input.reason ?? null,
      input.note ?? null,
      now,
      now,
    )
    const row = db
      .prepare(
        `SELECT * FROM x_inbox_feedback
         WHERE account_handle = ? COLLATE NOCASE AND post_id = ?`,
      )
      .get(input.accountHandle, input.postId) as FeedbackRow
    return mapFeedback(row)
  } finally {
    db.close()
  }
}

export const clearInboxFeedbackRecord = (input: {
  accountHandle: string
  postId: string
  path?: string
}) => {
  const db = openDatabase(input.path)
  try {
    ensureInboxFeedbackSchema(db)
    const result = db
      .prepare(
        `DELETE FROM x_inbox_feedback
         WHERE account_handle = ? COLLATE NOCASE AND post_id = ?`,
      )
      .run(input.accountHandle, input.postId)
    return result.changes === 1
  } finally {
    db.close()
  }
}
