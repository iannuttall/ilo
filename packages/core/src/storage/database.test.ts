import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import Database from 'better-sqlite3'
import {
  claimDueDraftRecords,
  createDraftRecord,
  finishDraftPublish,
  getDraftRecord,
  listDraftRecords,
  openDatabase,
  scheduleDraftRecord,
} from './database.js'

test('stores, schedules, claims, and finishes a local draft', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-database-'))
  const path = join(directory, 'ilo.sqlite')
  try {
    const draft = createDraftRecord(
      'Local draft',
      {
        replyToPostId: '123456789',
        images: [{ path: '/tmp/image.png', altText: 'A useful chart' }],
      },
      path,
    )
    assert.equal(listDraftRecords(path).length, 1)
    assert.equal(draft.replyToPostId, '123456789')
    assert.deepEqual(draft.images, [
      { path: '/tmp/image.png', altText: 'A useful chart' },
    ])

    const scheduled = scheduleDraftRecord(draft.id, 1_000, path)
    assert.equal(scheduled.status, 'scheduled')
    assert.equal(scheduled.scheduledAt, 1_000)

    const [claimed] = claimDueDraftRecords(1_001, 20, path)
    assert.equal(claimed?.id, draft.id)
    assert.equal(claimed?.status, 'publishing')

    finishDraftPublish({
      id: draft.id,
      ok: true,
      providerPostId: '123',
      providerUrl: 'https://x.com/i/web/status/123',
      path,
    })

    const published = getDraftRecord(draft.id, path)
    assert.equal(published.status, 'published')
    assert.equal(published.publishedPostId, '123')
    assert.equal(published.replyToPostId, '123456789')
    assert.deepEqual(published.images, [
      { path: '/tmp/image.png', altText: 'A useful chart' },
    ])
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('adds reply and image storage to an existing local database', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-database-migration-'))
  const path = join(directory, 'ilo.sqlite')
  const legacy = new Database(path)
  legacy.exec(`
    CREATE TABLE drafts (
      id TEXT PRIMARY KEY,
      body TEXT NOT NULL,
      status TEXT NOT NULL,
      scheduled_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      published_post_id TEXT,
      published_url TEXT,
      last_error TEXT
    );
  `)
  legacy.close()

  try {
    const migrated = openDatabase(path)
    const draftColumns = migrated
      .prepare('PRAGMA table_info(drafts)')
      .all() as Array<{
      name: string
    }>
    const mediaTable = migrated
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'draft_images'",
      )
      .get() as { name: string } | undefined
    assert.equal(
      draftColumns.some((column) => column.name === 'reply_to_post_id'),
      true,
    )
    assert.equal(mediaTable?.name, 'draft_images')
    migrated.close()
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
