import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

test('CLI switches publishing defaults without moving bound drafts', async () => {
  const iloHome = await mkdtemp(join(tmpdir(), 'ilo-package-accounts-'))
  const now = Date.now()
  const personal = {
    id: 'typefully:7:10',
    alias: 'personal',
    provider: 'typefully',
    platform: 'x',
    socialSetId: 10,
    credentialId: '7',
    username: 'personal',
    displayName: 'Personal',
    createdAt: now,
  }
  const work = {
    id: 'typefully:7:20',
    alias: 'work',
    provider: 'typefully',
    platform: 'x',
    socialSetId: 20,
    credentialId: '7',
    username: 'workaccount',
    displayName: 'Work',
    createdAt: now,
  }
  try {
    await writeFile(
      join(iloHome, 'config.json'),
      `${JSON.stringify({
        version: 2,
        timezone: 'UTC',
        defaultPublishingAccountId: personal.id,
        publishingAccounts: [personal, work],
      })}\n`,
    )
    const created = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'drafts',
        'create',
        '--account',
        'work',
        '--text',
        'This belongs to work',
        '--json',
      ],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        env: { ...process.env, ILO_HOME: iloHome },
      },
    )
    assert.equal(created.status, 0, created.stderr)
    const draft = JSON.parse(created.stdout)
    assert.equal(draft.publishingAccount.id, work.id)

    const switched = spawnSync(
      process.execPath,
      ['dist/cli.js', 'accounts', 'use', 'personal', '--json'],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        env: { ...process.env, ILO_HOME: iloHome },
      },
    )
    assert.equal(switched.status, 0, switched.stderr)
    assert.equal(JSON.parse(switched.stdout).defaultAccount.id, personal.id)

    const listed = spawnSync(
      process.execPath,
      ['dist/cli.js', 'drafts', 'list', '--account', 'work', '--json'],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        env: { ...process.env, ILO_HOME: iloHome },
      },
    )
    assert.equal(listed.status, 0, listed.stderr)
    const drafts = JSON.parse(listed.stdout).drafts
    assert.equal(drafts.length, 1)
    assert.equal(drafts[0].publishingAccount.id, work.id)
  } finally {
    await rm(iloHome, { recursive: true, force: true })
  }
})
