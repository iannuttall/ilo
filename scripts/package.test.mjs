import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { stripVTControlCharacters } from 'node:util'

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
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  )
  assert.equal(module.ILO_VERSION, packageJson.version)
  assert.equal(packageJson.dependencies['better-sqlite3'], undefined)
  assert.equal(typeof module.createDraft, 'function')
  assert.equal(typeof module.parseScheduleTime, 'function')
  assert.equal(typeof module.syncXFollowers, 'function')
  assert.equal(typeof module.syncAllXFollowers, 'function')
  assert.equal(typeof module.searchXFollowers, 'function')
  assert.equal(typeof module.getXFollowerProfile, 'function')
  assert.equal(typeof module.fetchFxTwitterFollowers, 'function')
  assert.equal(typeof module.normalizeXPostId, 'function')
})

test('CLI reports the public package version', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  )
  const result = spawnSync(process.execPath, ['dist/cli.js', '--version'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), packageJson.version)
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

  const start = spawnSync(
    process.execPath,
    ['dist/cli.js', 'start', '--help'],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
    },
  )
  assert.equal(start.status, 0, start.stderr)
  assert.match(start.stdout, /X developer app/)
  assert.match(start.stdout, /http:\/\/127\.0\.0\.1:8976\/callback/)
})

test('CLI exposes follower research, replies, and images', () => {
  const followers = spawnSync(
    process.execPath,
    ['dist/cli.js', 'x', 'followers', '--help'],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
    },
  )
  assert.equal(followers.status, 0, followers.stderr)
  assert.match(followers.stdout, /sync/)
  assert.match(followers.stdout, /profile/)
  assert.match(followers.stdout, /search/)

  const followerSync = spawnSync(
    process.execPath,
    ['dist/cli.js', 'x', 'followers', 'sync', '--help'],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
    },
  )
  assert.equal(followerSync.status, 0, followerSync.stderr)
  assert.match(followerSync.stdout, /--background/)

  const post = spawnSync(process.execPath, ['dist/cli.js', 'post', '--help'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  })
  assert.equal(post.status, 0, post.stderr)
  assert.match(post.stdout, /--reply-to/)
  assert.match(post.stdout, /--image/)
})

test('CLI stores repeated image options on a reply draft', async () => {
  const iloHome = await mkdtemp(join(tmpdir(), 'ilo-package-'))
  try {
    const result = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'drafts',
        'create',
        '--text',
        'Reply draft',
        '--reply-to',
        'https://x.com/example/status/123',
        '--image',
        './one.png',
        '--alt',
        'First image',
        '--image',
        './two.webp',
        '--alt',
        'Second image',
        '--json',
      ],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        env: { ...process.env, ILO_HOME: iloHome },
      },
    )
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stderr, '')
    const draft = JSON.parse(result.stdout)
    assert.equal(draft.replyToPostId, '123')
    assert.deepEqual(
      draft.images.map((image) => ({
        file: image.path.split('/').at(-1),
        altText: image.altText,
      })),
      [
        { file: 'one.png', altText: 'First image' },
        { file: 'two.webp', altText: 'Second image' },
      ],
    )
  } finally {
    await rm(iloHome, { recursive: true, force: true })
  }
})

test('CLI and public library use the same follower search behavior', async () => {
  const iloHome = await mkdtemp(join(tmpdir(), 'ilo-package-followers-'))
  try {
    const module = await import('../dist/index.js')
    await module.syncXFollowers(
      {
        handle: 'subject',
        maxPages: 1,
        databasePath: join(iloHome, 'ilo.sqlite'),
      },
      {
        profile: async () => ({
          id: 'subject-id',
          name: 'Subject',
          screen_name: 'subject',
          followers: 1,
        }),
        followers: async () => ({
          profiles: [
            {
              id: 'follower-id',
              name: 'Follower',
              screen_name: 'follower',
              description: 'GTM @vercel',
              statuses: 120,
              likes: 80,
              joined: 'Mon Jan 01 00:00:00 +0000 2024',
              website: {
                url: 'https://example.com',
                display_url: 'example.com',
              },
            },
          ],
          nextCursor: null,
        }),
      },
    )

    const result = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'x',
        'followers',
        'search',
        'subject',
        '--query',
        'works at vercel',
        '--json',
      ],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        env: { ...process.env, ILO_HOME: iloHome },
      },
    )
    assert.equal(result.status, 0, result.stderr)
    const search = JSON.parse(result.stdout)
    assert.equal(search.groups[0].current, 1)
    assert.equal(search.groups[0].unclear, 0)

    const humanResult = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'x',
        'followers',
        'search',
        'subject',
        '--query',
        'works at vercel',
      ],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        env: { ...process.env, FORCE_COLOR: '0', ILO_HOME: iloHome },
      },
    )
    assert.equal(humanResult.status, 0, humanResult.stderr)
    const humanOutput = stripVTControlCharacters(humanResult.stdout)
    assert.match(humanOutput, /Follower search for @subject/)
    assert.match(humanOutput, /Company\s+│\s+Current/)
    assert.match(humanOutput, /vercel\s+│\s+1/)
    assert.match(humanOutput, /Matching profiles/)
    assert.match(humanOutput, /@follower/)

    const csvPath = join(iloHome, 'exports', 'vercel-followers.csv')
    const csvResult = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'x',
        'followers',
        'search',
        'subject',
        '--query',
        'works at vercel',
        '--csv',
        csvPath,
        '--json',
      ],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        env: { ...process.env, ILO_HOME: iloHome },
      },
    )
    assert.equal(csvResult.status, 0, csvResult.stderr)
    const csvSearch = JSON.parse(csvResult.stdout)
    assert.equal(csvSearch.csvExport.path, csvPath)
    assert.equal(csvSearch.csvExport.rows, 1)
    const csv = await readFile(csvPath, 'utf8')
    assert.match(csv, /^"company","classification","evidence","id"/)
    assert.match(csv, /"vercel","current","GTM @vercel"/)
    assert.match(csv, /"follower-id","follower","Follower"/)
    assert.match(csv, /"source_profiles_indexed"/)

    const profileResult = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'x',
        'followers',
        'profile',
        'subject',
        'follower',
        '--json',
      ],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        env: { ...process.env, ILO_HOME: iloHome },
      },
    )
    assert.equal(profileResult.status, 0, profileResult.stderr)
    const storedProfile = JSON.parse(profileResult.stdout)
    assert.equal(storedProfile.profile.posts, 120)
    assert.equal(storedProfile.profile.websiteDisplayUrl, 'example.com')
    assert.equal(storedProfile.profile.providerData.screen_name, 'follower')

    let duplicatePage = 0
    await assert.rejects(
      module.syncXFollowers(
        {
          handle: 'subject',
          maxPages: 100,
          restart: true,
          databasePath: join(iloHome, 'ilo.sqlite'),
        },
        {
          profile: async () => ({
            id: 'subject-id',
            name: 'Subject',
            screen_name: 'subject',
            followers: 1,
          }),
          followers: async () => {
            duplicatePage += 1
            return {
              profiles: [
                {
                  id: 'follower-id',
                  name: 'Follower',
                  screen_name: 'follower',
                  description: 'GTM @vercel',
                },
              ],
              nextCursor: `duplicate-${duplicatePage}`,
            }
          },
        },
      ),
      /fxtwitter_follower_sync_no_progress/,
    )

    const statusResult = spawnSync(
      process.execPath,
      ['dist/cli.js', 'x', 'followers', 'status', 'subject'],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        env: { ...process.env, ILO_HOME: iloHome },
      },
    )
    assert.equal(statusResult.status, 0, statusResult.stderr)
    assert.match(statusResult.stdout, /stopped after repeated duplicate pages/)
    assert.match(statusResult.stdout, /follower profiles are searchable/)
  } finally {
    await rm(iloHome, { recursive: true, force: true })
  }
})
