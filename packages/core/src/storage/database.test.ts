import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  claimDueDraftRecords,
  createDraftRecord,
  finishDraftPublish,
  getDraftRecord,
  listDraftRecords,
  scheduleDraftRecord,
} from './database.js'

test('stores, schedules, claims, and finishes a local draft', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-database-'))
  const path = join(directory, 'ilo.sqlite')
  try {
    const draft = createDraftRecord('Local draft', path)
    assert.equal(listDraftRecords(path).length, 1)

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
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
