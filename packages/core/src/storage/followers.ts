import { randomUUID } from 'node:crypto'
import { openDatabase } from './database.js'
import type Database from './sqlite.js'

export type StoredXProfile = {
  id: string
  handle: string
  name: string
  bio: string
  location: string
  profileUrl: string
  avatarUrl: string | null
  bannerUrl: string | null
  followers: number | null
  following: number | null
  posts: number | null
  likes: number | null
  mediaCount: number | null
  joinedAt: string | null
  websiteUrl: string | null
  websiteDisplayUrl: string | null
  verified: boolean
  verificationType: string | null
  protected: boolean
  aliases: string
  providerDataJson: string
  fetchedAt: number
}

export type FollowerSubject = {
  id: string
  handle: string
  name: string
  expectedFollowers: number | null
}

export type FollowerSyncState = {
  syncId: string
  subjectId: string
  handle: string
  name: string
  expectedFollowers: number | null
  cursor: string | null
  complete: boolean
  pagesFetched: number
  importedProfiles: number
  startedAt: number
  updatedAt: number
  completedAt: number | null
  lastError: string | null
}

type FollowerSourceRow = {
  subject_id: string
  handle: string
  name: string
  expected_followers: number | null
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

export type FollowerSearchRow = StoredXProfile & { rank: number }

export type StoredXProfileRow = {
  id: string
  handle: string
  name: string
  bio: string
  location: string
  profile_url: string
  avatar_url: string | null
  banner_url: string | null
  followers: number | null
  following: number | null
  posts: number | null
  likes: number | null
  media_count: number | null
  joined_at: string | null
  website_url: string | null
  website_display_url: string | null
  verified: number
  verification_type: string | null
  protected: number
  aliases: string
  provider_data_json: string
  fetched_at: number
}

export const mapStoredProfile = (row: StoredXProfileRow): StoredXProfile => ({
  id: row.id,
  handle: row.handle,
  name: row.name,
  bio: row.bio,
  location: row.location,
  profileUrl: row.profile_url,
  avatarUrl: row.avatar_url,
  bannerUrl: row.banner_url,
  followers: row.followers,
  following: row.following,
  posts: row.posts,
  likes: row.likes,
  mediaCount: row.media_count,
  joinedAt: row.joined_at,
  websiteUrl: row.website_url,
  websiteDisplayUrl: row.website_display_url,
  verified: Boolean(row.verified),
  verificationType: row.verification_type,
  protected: Boolean(row.protected),
  aliases: row.aliases,
  providerDataJson: row.provider_data_json,
  fetchedAt: row.fetched_at,
})

const mapSyncState = (row: FollowerSourceRow): FollowerSyncState => ({
  syncId: row.sync_id,
  subjectId: row.subject_id,
  handle: row.handle,
  name: row.name,
  expectedFollowers: row.expected_followers,
  cursor: row.cursor,
  complete: Boolean(row.complete),
  pagesFetched: row.pages_fetched,
  importedProfiles: row.profiles_seen,
  startedAt: row.started_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at,
  lastError: row.last_error,
})

export const ensureFollowerSchema = (db: Database) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS x_follower_sources (
      subject_id TEXT PRIMARY KEY,
      handle TEXT NOT NULL COLLATE NOCASE UNIQUE,
      name TEXT NOT NULL,
      expected_followers INTEGER,
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
    CREATE TABLE IF NOT EXISTS x_public_profiles (
      id TEXT PRIMARY KEY,
      handle TEXT NOT NULL COLLATE NOCASE,
      name TEXT NOT NULL,
      bio TEXT NOT NULL,
      location TEXT NOT NULL,
      profile_url TEXT NOT NULL,
      avatar_url TEXT,
      banner_url TEXT,
      followers INTEGER,
      following INTEGER,
      posts INTEGER,
      likes INTEGER,
      media_count INTEGER,
      joined_at TEXT,
      website_url TEXT,
      website_display_url TEXT,
      verified INTEGER NOT NULL,
      verification_type TEXT,
      protected INTEGER NOT NULL,
      aliases TEXT NOT NULL,
      provider_data_json TEXT NOT NULL DEFAULT '{}',
      fetched_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS x_public_profiles_handle_idx
      ON x_public_profiles(handle);
    CREATE TABLE IF NOT EXISTS x_follower_relationships (
      subject_id TEXT NOT NULL REFERENCES x_follower_sources(subject_id) ON DELETE CASCADE,
      follower_id TEXT NOT NULL REFERENCES x_public_profiles(id) ON DELETE CASCADE,
      last_seen_sync_id TEXT NOT NULL,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      PRIMARY KEY (subject_id, follower_id)
    );
    CREATE INDEX IF NOT EXISTS x_follower_relationships_sync_idx
      ON x_follower_relationships(subject_id, last_seen_sync_id);
    CREATE VIRTUAL TABLE IF NOT EXISTS x_public_profiles_fts USING fts5(
      profile_id UNINDEXED,
      handle,
      name,
      bio,
      location,
      aliases,
      tokenize = 'unicode61 remove_diacritics 2'
    );
  `)

  const profileColumns = new Set(
    (
      db.prepare('PRAGMA table_info(x_public_profiles)').all() as Array<{
        name: string
      }>
    ).map((column) => column.name),
  )
  const additions = [
    ['banner_url', 'TEXT'],
    ['posts', 'INTEGER'],
    ['likes', 'INTEGER'],
    ['media_count', 'INTEGER'],
    ['joined_at', 'TEXT'],
    ['website_url', 'TEXT'],
    ['website_display_url', 'TEXT'],
    ['verification_type', 'TEXT'],
    ['provider_data_json', "TEXT NOT NULL DEFAULT '{}'"],
  ] as const
  for (const [name, definition] of additions) {
    if (!profileColumns.has(name)) {
      db.exec(`ALTER TABLE x_public_profiles ADD COLUMN ${name} ${definition}`)
    }
  }
}

const readSyncState = (
  db: Database,
  handle: string,
): FollowerSyncState | null => {
  const row = db
    .prepare('SELECT * FROM x_follower_sources WHERE handle = ? COLLATE NOCASE')
    .get(handle) as FollowerSourceRow | undefined
  return row ? mapSyncState(row) : null
}

export const startFollowerSync = (input: {
  subject: FollowerSubject
  restart?: boolean
  path?: string
  now?: number
}): FollowerSyncState => {
  const db = openDatabase(input.path)
  try {
    ensureFollowerSchema(db)
    const now = input.now ?? Date.now()
    const existing = readSyncState(db, input.subject.handle)
    const startNew = !existing || input.restart
    const syncId = startNew ? randomUUID() : existing.syncId
    db.prepare(
      `INSERT INTO x_follower_sources (
        subject_id, handle, name, expected_followers, sync_id, cursor,
        complete, pages_fetched, profiles_seen, started_at, updated_at,
        completed_at, last_error
      ) VALUES (?, ?, ?, ?, ?, NULL, 0, 0, 0, ?, ?, NULL, NULL)
      ON CONFLICT(handle) DO UPDATE SET
        subject_id = excluded.subject_id,
        name = excluded.name,
        expected_followers = excluded.expected_followers,
        sync_id = ?,
        cursor = CASE WHEN ? THEN NULL ELSE x_follower_sources.cursor END,
        complete = CASE WHEN ? THEN 0 ELSE x_follower_sources.complete END,
        pages_fetched = CASE WHEN ? THEN 0 ELSE x_follower_sources.pages_fetched END,
        profiles_seen = CASE WHEN ? THEN 0 ELSE x_follower_sources.profiles_seen END,
        started_at = CASE WHEN ? THEN excluded.started_at ELSE x_follower_sources.started_at END,
        updated_at = excluded.updated_at,
        completed_at = CASE WHEN ? THEN NULL ELSE x_follower_sources.completed_at END,
        last_error = NULL`,
    ).run(
      input.subject.id,
      input.subject.handle,
      input.subject.name,
      input.subject.expectedFollowers,
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
    if (!state) throw new Error('follower_sync_state_missing')
    return state
  } finally {
    db.close()
  }
}

export const upsertPublicProfile = (db: Database) => {
  const profile = db.prepare(`INSERT INTO x_public_profiles (
      id, handle, name, bio, location, profile_url, avatar_url, banner_url,
      followers, following, posts, likes, media_count, joined_at, website_url,
      website_display_url, verified, verification_type, protected, aliases,
      provider_data_json, fetched_at
    ) VALUES (
      @id, @handle, @name, @bio, @location, @profileUrl, @avatarUrl, @bannerUrl,
      @followers, @following, @posts, @likes, @mediaCount, @joinedAt,
      @websiteUrl, @websiteDisplayUrl, @verified, @verificationType, @protected,
      @aliases, @providerDataJson, @fetchedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      handle = excluded.handle,
      name = excluded.name,
      bio = excluded.bio,
      location = excluded.location,
      profile_url = excluded.profile_url,
      avatar_url = excluded.avatar_url,
      banner_url = excluded.banner_url,
      followers = excluded.followers,
      following = excluded.following,
      posts = excluded.posts,
      likes = excluded.likes,
      media_count = excluded.media_count,
      joined_at = excluded.joined_at,
      website_url = excluded.website_url,
      website_display_url = excluded.website_display_url,
      verified = excluded.verified,
      verification_type = excluded.verification_type,
      protected = excluded.protected,
      aliases = excluded.aliases,
      provider_data_json = excluded.provider_data_json,
      fetched_at = excluded.fetched_at`)
  const removeFts = db.prepare(
    'DELETE FROM x_public_profiles_fts WHERE profile_id = ?',
  )
  const addFts = db.prepare(`INSERT INTO x_public_profiles_fts (
      profile_id, handle, name, bio, location, aliases
    ) VALUES (?, ?, ?, ?, ?, ?)`)
  return (value: StoredXProfile) => {
    profile.run({
      ...value,
      verified: value.verified ? 1 : 0,
      protected: value.protected ? 1 : 0,
    })
    removeFts.run(value.id)
    addFts.run(
      value.id,
      value.handle,
      value.name,
      value.bio,
      value.location,
      value.aliases,
    )
  }
}

export const storeFollowerPage = (input: {
  handle: string
  syncId: string
  profiles: StoredXProfile[]
  nextCursor: string | null
  path?: string
  now?: number
}): FollowerSyncState => {
  const db = openDatabase(input.path)
  try {
    ensureFollowerSchema(db)
    const now = input.now ?? Date.now()
    const complete = input.nextCursor === null
    const save = db.transaction(() => {
      const source = db
        .prepare(
          'SELECT subject_id FROM x_follower_sources WHERE handle = ? COLLATE NOCASE AND sync_id = ?',
        )
        .get(input.handle, input.syncId) as { subject_id: string } | undefined
      if (!source) throw new Error('follower_sync_not_active')

      const saveProfile = upsertPublicProfile(db)
      const relationship = db.prepare(`INSERT INTO x_follower_relationships (
          subject_id, follower_id, last_seen_sync_id, first_seen_at, last_seen_at
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(subject_id, follower_id) DO UPDATE SET
          last_seen_sync_id = excluded.last_seen_sync_id,
          last_seen_at = excluded.last_seen_at`)
      for (const profile of input.profiles) {
        saveProfile(profile)
        relationship.run(source.subject_id, profile.id, input.syncId, now, now)
      }

      if (complete) {
        db.prepare(
          `DELETE FROM x_follower_relationships
           WHERE subject_id = ? AND last_seen_sync_id <> ?`,
        ).run(source.subject_id, input.syncId)
      }
      const profilesSeen = (
        db
          .prepare(
            `SELECT COUNT(*) AS count FROM x_follower_relationships
             WHERE subject_id = ? AND last_seen_sync_id = ?`,
          )
          .get(source.subject_id, input.syncId) as { count: number }
      ).count
      db.prepare(
        `UPDATE x_follower_sources SET
          cursor = ?,
          complete = ?,
          pages_fetched = pages_fetched + 1,
          profiles_seen = ?,
          updated_at = ?,
          completed_at = ?,
          last_error = NULL
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
    })
    save()
    const state = readSyncState(db, input.handle)
    if (!state) throw new Error('follower_sync_state_missing')
    return state
  } finally {
    db.close()
  }
}

export const markFollowerSyncError = (input: {
  handle: string
  syncId: string
  error: string
  path?: string
  now?: number
}) => {
  const db = openDatabase(input.path)
  try {
    ensureFollowerSchema(db)
    db.prepare(
      `UPDATE x_follower_sources SET last_error = ?, updated_at = ?
       WHERE handle = ? COLLATE NOCASE AND sync_id = ?`,
    ).run(input.error, input.now ?? Date.now(), input.handle, input.syncId)
  } finally {
    db.close()
  }
}

export const getFollowerSyncState = (
  handle: string,
  path?: string,
): FollowerSyncState | null => {
  const db = openDatabase(path)
  try {
    ensureFollowerSchema(db)
    return readSyncState(db, handle)
  } finally {
    db.close()
  }
}

export const getFollowerProfile = (input: {
  handle: string
  followerHandle: string
  path?: string
}): StoredXProfile | null => {
  const db = openDatabase(input.path)
  try {
    ensureFollowerSchema(db)
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
        JOIN x_follower_relationships r ON r.follower_id = p.id
        JOIN x_follower_sources s ON s.subject_id = r.subject_id
        WHERE s.handle = ? COLLATE NOCASE
          AND p.handle = ? COLLATE NOCASE
          AND r.last_seen_sync_id = s.sync_id
        LIMIT 1`,
      )
      .get(input.handle, input.followerHandle) as StoredXProfileRow | undefined
    return row ? mapStoredProfile(row) : null
  } finally {
    db.close()
  }
}

export const searchFollowerRows = (input: {
  handle: string
  ftsQuery: string
  limit: number
  path?: string
}): FollowerSearchRow[] => {
  const db = openDatabase(input.path)
  try {
    ensureFollowerSchema(db)
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
        JOIN x_follower_relationships r ON r.follower_id = p.id
        JOIN x_follower_sources s ON s.subject_id = r.subject_id
        WHERE s.handle = ? COLLATE NOCASE
          AND r.last_seen_sync_id = s.sync_id
          AND x_public_profiles_fts MATCH ?
        ORDER BY rank ASC, p.followers DESC
        LIMIT ?`,
      )
      .all(input.handle, input.ftsQuery, input.limit) as Array<{
      id: StoredXProfileRow['id']
      handle: StoredXProfileRow['handle']
      name: StoredXProfileRow['name']
      bio: StoredXProfileRow['bio']
      location: StoredXProfileRow['location']
      profile_url: StoredXProfileRow['profile_url']
      avatar_url: StoredXProfileRow['avatar_url']
      banner_url: StoredXProfileRow['banner_url']
      followers: StoredXProfileRow['followers']
      following: StoredXProfileRow['following']
      posts: StoredXProfileRow['posts']
      likes: StoredXProfileRow['likes']
      media_count: StoredXProfileRow['media_count']
      joined_at: StoredXProfileRow['joined_at']
      website_url: StoredXProfileRow['website_url']
      website_display_url: StoredXProfileRow['website_display_url']
      verified: StoredXProfileRow['verified']
      verification_type: StoredXProfileRow['verification_type']
      protected: StoredXProfileRow['protected']
      aliases: StoredXProfileRow['aliases']
      provider_data_json: StoredXProfileRow['provider_data_json']
      fetched_at: StoredXProfileRow['fetched_at']
      rank: number
    }>
    return rows.map((row) => ({
      ...mapStoredProfile(row),
      rank: row.rank,
    }))
  } finally {
    db.close()
  }
}
