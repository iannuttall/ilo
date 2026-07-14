import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { access } from 'node:fs/promises'
import test from 'node:test'

test('package exports and binaries are built', async () => {
  await Promise.all([
    access(new URL('../dist/index.js', import.meta.url)),
    access(new URL('../dist/index.d.ts', import.meta.url)),
    access(new URL('../dist/mcp.js', import.meta.url)),
    access(new URL('../dist/cli.js', import.meta.url)),
  ])
})

test('public API can be imported', async () => {
  const module = await import('../dist/index.js')
  assert.equal(typeof module.createDraft, 'function')
  assert.equal(typeof module.parseScheduleTime, 'function')
})

test('CLI starts and prints its command surface', () => {
  const result = spawnSync(process.execPath, ['dist/cli.js', '--help'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Local-first social publishing/)
  assert.match(result.stdout, /scheduler/)
  assert.match(result.stdout, /mcp/)
})
