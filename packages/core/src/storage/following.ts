import { randomUUID } from 'node:crypto'
import { openDatabase } from './database.js'
import {
  ensureFollowerSchema,
  type FollowerSearchRow,
  mapStoredProfile,
  type StoredXProfile,
  type StoredXProfileRow,
  upsertPublicProfile,
} from './followers.js'
import type Database from './sqlite.js'

export type FollowingSubject = {
  id: string
  handle: string
  name: string
  expectedFollowing: number | null
}

export type FollowingProfile = StoredXProfile

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
  searchableProfiles: number
  profileDataVersion: number
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
  searchable_profiles: number
  profile_data_version: number
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
  searchableProfiles: row.searchable_profiles,
  profileDataVersion: row.profile_data_version,
  startedAt: row.started_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at,
  lastError: row.last_error,
})

export const ensureFollowingSchema = (db: Database) => {
  ensureFollowerSchema(db)
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
      profile_data_version INTEGER NOT NULL DEFAULT 1,
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

  const sourceColumns = new Set(
    (
      db.prepare('PRAGMA table_info(x_following_sources)').all() as Array<{
        name: string
      }>
    ).map((column) => column.name),
  )
  if (!sourceColumns.has('profile_data_version')) {
    db.exec(
      'ALTER TABLE x_following_sources ADD COLUMN profile_data_version INTEGER NOT NULL DEFAULT 0',
    )
  }
}

const readSyncState = (
  db: Database,
  handle: string,
): FollowingSyncState | null => {
  const row = db
    .prepare(
      `SELECT s.*,
        (
          SELECT COUNT(*)
          FROM x_following_relationships r
          JOIN x_public_profiles p ON p.id = r.followed_id
          WHERE r.subject_id = s.subject_id
            AND r.last_seen_sync_id = s.sync_id
        ) AS searchable_profiles
       FROM x_following_sources s
       WHERE s.handle = ? COLLATE NOCASE`,
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
    const startNew =
      !existing ||
      input.restart ||
      existing.complete ||
      existing.profileDataVersion < 1
    const syncId = startNew ? randomUUID() : existing.syncId
    db.prepare(
      `INSERT INTO x_following_sources (
        subject_id, handle, name, expected_following, sync_id, cursor,
        complete, pages_fetched, profiles_seen, profile_data_version, started_at,
        updated_at, completed_at, last_error
      ) VALUES (?, ?, ?, ?, ?, NULL, 0, 0, 0, 1, ?, ?, NULL, NULL)
      ON CONFLICT(handle) DO UPDATE SET
        subject_id = excluded.subject_id,
        name = excluded.name,
        expected_following = excluded.expected_following,
        profile_data_version = 1,
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

      const saveProfile = upsertPublicProfile(db)
      const relationship = db.prepare(`INSERT INTO x_following_relationships (
          subject_id, followed_id, followed_handle, last_seen_sync_id,
          first_seen_at, last_seen_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(subject_id, followed_id) DO UPDATE SET
          followed_handle = excluded.followed_handle,
          last_seen_sync_id = excluded.last_seen_sync_id,
          last_seen_at = excluded.last_seen_at`)
      for (const profile of input.profiles) {
        saveProfile(profile)
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
          profiles_seen = ?, profile_data_version = 1, updated_at = ?,
          completed_at = ?, last_error = NULL
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

export const getFollowingProfile = (input: {
  handle: string
  followedHandle: string
  path?: string
}): StoredXProfile | null => {
  const db = openDatabase(input.path)
  try {
    ensureFollowingSchema(db)
    const row = db
      .prepare(
        `SELECT
          p.id,
          p.handle,
          p.name,
          p.bio,
          p.location,
          p.profile_url,
          p.avatar_url,
          p.banner_url,
          p.followers,
          p.following,
          p.posts,
          p.likes,
          p.media_count,
          p.joined_at,
          p.website_url,
          p.website_display_url,
          p.verified,
          p.verification_type,
          p.protected,
          p.aliases,
          p.provider_data_json,
          p.fetched_at
        FROM x_public_profiles p
        JOIN x_following_relationships r ON r.followed_id = p.id
        JOIN x_following_sources s ON s.subject_id = r.subject_id
        WHERE s.handle = ? COLLATE NOCASE
          AND p.handle = ? COLLATE NOCASE
          AND r.last_seen_sync_id = s.sync_id
        LIMIT 1`,
      )
      .get(input.handle, input.followedHandle) as StoredXProfileRow | undefined
    return row ? mapStoredProfile(row) : null
  } finally {
    db.close()
  }
}

export const searchFollowingRows = (input: {
  handle: string
  ftsQuery: string
  limit?: number
  path?: string
}): FollowerSearchRow[] => {
  const db = openDatabase(input.path)
  try {
    ensureFollowingSchema(db)
    const rows = db
      .prepare(
        `SELECT
          p.id,
          p.handle,
          p.name,
          p.bio,
          p.location,
          p.profile_url,
          p.avatar_url,
          p.banner_url,
          p.followers,
          p.following,
          p.posts,
          p.likes,
          p.media_count,
          p.joined_at,
          p.website_url,
          p.website_display_url,
          p.verified,
          p.verification_type,
          p.protected,
          p.aliases,
          p.provider_data_json,
          p.fetched_at,
          bm25(x_public_profiles_fts, 0, 2, 3, 1, 1, 2) AS rank
        FROM x_public_profiles_fts
        JOIN x_public_profiles p ON p.id = x_public_profiles_fts.profile_id
        JOIN x_following_relationships r ON r.followed_id = p.id
        JOIN x_following_sources s ON s.subject_id = r.subject_id
        WHERE s.handle = ? COLLATE NOCASE
          AND r.last_seen_sync_id = s.sync_id
          AND x_public_profiles_fts MATCH ?
        ORDER BY rank ASC, p.followers DESC
        LIMIT ?`,
      )
      .all(input.handle, input.ftsQuery, input.limit ?? -1) as Array<
      StoredXProfileRow & { rank: number }
    >
    return rows.map((row) => ({
      ...mapStoredProfile(row),
      rank: row.rank,
    }))
  } finally {
    db.close()
  }
}
