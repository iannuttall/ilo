import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import { openDatabase } from './database.js'

export type FollowingSubject = {
  id: string
  handle: string
  name: string
  expectedFollowing: number | null
}

export type FollowingProfile = {
  id: string
  handle: string
}

export type FollowingSyncState = {
  syncId: string
  subjectId: string
  handle: string
  name: string
  expectedFollowing: number | null
  cursor: string | null
  complete: boolean
  pagesFetched: number
  importedProfiles: number
  startedAt: number
  updatedAt: number
  completedAt: number | null
  lastError: string | null
}

type FollowingSourceRow = {
  subject_id: string
  handle: string
  name: string
  expected_following: number | null
  sync_id: string
  cursor: string | null
  complete: number
  pages_fetched: number
  profiles_seen: number
  started_at: number
  updated_at: number
  completed_at: number | null
  last_error: string | null
}

const mapSyncState = (row: FollowingSourceRow): FollowingSyncState => ({
  syncId: row.sync_id,
  subjectId: row.subject_id,
  handle: row.handle,
  name: row.name,
  expectedFollowing: row.expected_following,
  cursor: row.cursor,
  complete: Boolean(row.complete),
  pagesFetched: row.pages_fetched,
  importedProfiles: row.profiles_seen,
  startedAt: row.started_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at,
  lastError: row.last_error,
})

export const ensureFollowingSchema = (db: Database.Database) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS x_following_sources (
      subject_id TEXT PRIMARY KEY,
      handle TEXT NOT NULL COLLATE NOCASE UNIQUE,
      name TEXT NOT NULL,
      expected_following INTEGER,
      sync_id TEXT NOT NULL,
      cursor TEXT,
      complete INTEGER NOT NULL DEFAULT 0,
      pages_fetched INTEGER NOT NULL DEFAULT 0,
      profiles_seen INTEGER NOT NULL DEFAULT 0,
      started_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      completed_at INTEGER,
      last_error TEXT
    );
    CREATE TABLE IF NOT EXISTS x_following_relationships (
      subject_id TEXT NOT NULL REFERENCES x_following_sources(subject_id) ON DELETE CASCADE,
      followed_id TEXT NOT NULL,
      followed_handle TEXT NOT NULL COLLATE NOCASE,
      last_seen_sync_id TEXT NOT NULL,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      PRIMARY KEY (subject_id, followed_id)
    );
    CREATE INDEX IF NOT EXISTS x_following_relationships_sync_idx
      ON x_following_relationships(subject_id, last_seen_sync_id);
    CREATE INDEX IF NOT EXISTS x_following_relationships_handle_idx
      ON x_following_relationships(subject_id, followed_handle);
  `)
}

const readSyncState = (
  db: Database.Database,
  handle: string,
): FollowingSyncState | null => {
  const row = db
    .prepare(
      'SELECT * FROM x_following_sources WHERE handle = ? COLLATE NOCASE',
    )
    .get(handle) as FollowingSourceRow | undefined
  return row ? mapSyncState(row) : null
}

export const startFollowingSync = (input: {
  subject: FollowingSubject
  restart?: boolean
  path?: string
  now?: number
}): FollowingSyncState => {
  const db = openDatabase(input.path)
  try {
    ensureFollowingSchema(db)
    const now = input.now ?? Date.now()
    const existing = readSyncState(db, input.subject.handle)
    const startNew = !existing || input.restart
    const syncId = startNew ? randomUUID() : existing.syncId
    db.prepare(
      `INSERT INTO x_following_sources (
        subject_id, handle, name, expected_following, sync_id, cursor,
        complete, pages_fetched, profiles_seen, started_at, updated_at,
        completed_at, last_error
      ) VALUES (?, ?, ?, ?, ?, NULL, 0, 0, 0, ?, ?, NULL, NULL)
      ON CONFLICT(handle) DO UPDATE SET
        subject_id = excluded.subject_id,
        name = excluded.name,
        expected_following = excluded.expected_following,
        sync_id = ?,
        cursor = CASE WHEN ? THEN NULL ELSE x_following_sources.cursor END,
        complete = CASE WHEN ? THEN 0 ELSE x_following_sources.complete END,
        pages_fetched = CASE WHEN ? THEN 0 ELSE x_following_sources.pages_fetched END,
        profiles_seen = CASE WHEN ? THEN 0 ELSE x_following_sources.profiles_seen END,
        started_at = CASE WHEN ? THEN excluded.started_at ELSE x_following_sources.started_at END,
        updated_at = excluded.updated_at,
        completed_at = CASE WHEN ? THEN NULL ELSE x_following_sources.completed_at END,
        last_error = NULL`,
    ).run(
      input.subject.id,
      input.subject.handle,
      input.subject.name,
      input.subject.expectedFollowing,
      syncId,
      now,
      now,
      syncId,
      startNew ? 1 : 0,
      startNew ? 1 : 0,
      startNew ? 1 : 0,
      startNew ? 1 : 0,
      startNew ? 1 : 0,
      startNew ? 1 : 0,
    )
    const state = readSyncState(db, input.subject.handle)
    if (!state) throw new Error('following_sync_state_missing')
    return state
  } finally {
    db.close()
  }
}

export const storeFollowingPage = (input: {
  handle: string
  syncId: string
  profiles: FollowingProfile[]
  nextCursor: string | null
  path?: string
  now?: number
}): FollowingSyncState => {
  const db = openDatabase(input.path)
  try {
    ensureFollowingSchema(db)
    const now = input.now ?? Date.now()
    const complete = input.nextCursor === null
    db.transaction(() => {
      const source = db
        .prepare(
          'SELECT subject_id FROM x_following_sources WHERE handle = ? COLLATE NOCASE AND sync_id = ?',
        )
        .get(input.handle, input.syncId) as { subject_id: string } | undefined
      if (!source) throw new Error('following_sync_not_active')

      const relationship = db.prepare(`INSERT INTO x_following_relationships (
          subject_id, followed_id, followed_handle, last_seen_sync_id,
          first_seen_at, last_seen_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(subject_id, followed_id) DO UPDATE SET
          followed_handle = excluded.followed_handle,
          last_seen_sync_id = excluded.last_seen_sync_id,
          last_seen_at = excluded.last_seen_at`)
      for (const profile of input.profiles) {
        relationship.run(
          source.subject_id,
          profile.id,
          profile.handle,
          input.syncId,
          now,
          now,
        )
      }

      if (complete) {
        db.prepare(
          `DELETE FROM x_following_relationships
           WHERE subject_id = ? AND last_seen_sync_id <> ?`,
        ).run(source.subject_id, input.syncId)
      }
      const profilesSeen = (
        db
          .prepare(
            `SELECT COUNT(*) AS count FROM x_following_relationships
             WHERE subject_id = ? AND last_seen_sync_id = ?`,
          )
          .get(source.subject_id, input.syncId) as { count: number }
      ).count
      db.prepare(
        `UPDATE x_following_sources SET
          cursor = ?, complete = ?, pages_fetched = pages_fetched + 1,
          profiles_seen = ?, updated_at = ?, completed_at = ?, last_error = NULL
         WHERE subject_id = ? AND sync_id = ?`,
      ).run(
        input.nextCursor,
        complete ? 1 : 0,
        profilesSeen,
        now,
        complete ? now : null,
        source.subject_id,
        input.syncId,
      )
    })()
    const state = readSyncState(db, input.handle)
    if (!state) throw new Error('following_sync_state_missing')
    return state
  } finally {
    db.close()
  }
}

export const markFollowingSyncError = (input: {
  handle: string
  syncId: string
  error: string
  path?: string
  now?: number
}) => {
  const db = openDatabase(input.path)
  try {
    ensureFollowingSchema(db)
    db.prepare(
      `UPDATE x_following_sources SET last_error = ?, updated_at = ?
       WHERE handle = ? COLLATE NOCASE AND sync_id = ?`,
    ).run(input.error, input.now ?? Date.now(), input.handle, input.syncId)
  } finally {
    db.close()
  }
}

export const getFollowingSyncState = (
  handle: string,
  path?: string,
): FollowingSyncState | null => {
  const db = openDatabase(path)
  try {
    ensureFollowingSchema(db)
    return readSyncState(db, handle)
  } finally {
    db.close()
  }
}
