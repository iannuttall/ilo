import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canOfferInteractiveUpdate,
  inferSelfUpdateCommand,
  maybeOfferSelfUpdate,
} from './self-update.js'

test('infers the package manager from the installed package path', () => {
  assert.deepEqual(
    inferSelfUpdateCommand('/opt/homebrew/lib/node_modules/iloso/dist/cli.js'),
    {
      command: 'npm',
      args: ['install', '--global', 'iloso@latest'],
    },
  )
  assert.deepEqual(
    inferSelfUpdateCommand(
      '/Users/ian/Library/pnpm/global/5/.pnpm/iloso@0.2.0/node_modules/iloso/dist/cli.js',
    ),
    {
      command: 'pnpm',
      args: ['add', '--global', 'iloso@latest'],
    },
  )
})

test('does not update temporary, linked, or Volta installations', () => {
  assert.equal(
    inferSelfUpdateCommand(
      '/Users/ian/.npm/_npx/abc/node_modules/iloso/dist/cli.js',
    ),
    undefined,
  )
  assert.equal(
    inferSelfUpdateCommand('/Users/ian/dev/cli/ilo/dist/cli.js'),
    undefined,
  )
  assert.equal(
    inferSelfUpdateCommand(
      '/Users/ian/.volta/tools/image/packages/iloso/lib/node_modules/iloso/dist/cli.js',
    ),
    undefined,
  )
})

test('only offers updates in a human terminal', () => {
  const base = {
    argv: ['x', 'inbox', 'list'],
    env: {},
    stdinIsTty: true,
    stdoutIsTty: true,
  }
  assert.equal(canOfferInteractiveUpdate(base), true)
  assert.equal(
    canOfferInteractiveUpdate({ ...base, argv: [...base.argv, '--json'] }),
    false,
  )
  assert.equal(
    canOfferInteractiveUpdate({ ...base, argv: ['mcp', 'serve'] }),
    false,
  )
  assert.equal(canOfferInteractiveUpdate({ ...base, env: { CI: '1' } }), false)
  assert.equal(canOfferInteractiveUpdate({ ...base, stdinIsTty: false }), false)
})

test('updates after approval and tells the caller to stop', async () => {
  let ran: { args: string[]; command: string } | undefined
  const exitCode = await maybeOfferSelfUpdate(
    { name: 'iloso', version: '0.2.0' },
    {
      argv: ['x', 'inbox', 'list'],
      cliPath: '/opt/homebrew/lib/node_modules/iloso/dist/cli.js',
      createNotifier: () => ({
        update: { current: '0.2.0', latest: '0.3.0' },
      }),
      env: {},
      prompt: async () => 'update',
      run: (command) => {
        ran = command
        return 0
      },
      stdinIsTty: true,
      stdoutIsTty: true,
    },
  )

  assert.equal(exitCode, 0)
  assert.deepEqual(ran, {
    command: 'npm',
    args: ['install', '--global', 'iloso@latest'],
  })
})

test('continues without updating when the user chooses later', async () => {
  let ran = false
  const exitCode = await maybeOfferSelfUpdate(
    { name: 'iloso', version: '0.2.0' },
    {
      argv: ['x', 'inbox', 'list'],
      cliPath: '/opt/homebrew/lib/node_modules/iloso/dist/cli.js',
      createNotifier: () => ({
        update: { current: '0.2.0', latest: '0.3.0' },
      }),
      env: {},
      prompt: async () => 'later',
      run: () => {
        ran = true
        return 0
      },
      stdinIsTty: true,
      stdoutIsTty: true,
    },
  )

  assert.equal(exitCode, undefined)
  assert.equal(ran, false)
})
