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
  assert.equal(typeof module.fetchFxTwitterSearch, 'function')
  assert.equal(typeof module.fetchFxTwitterArticles, 'function')
  assert.equal(typeof module.fetchFxTwitterStatus, 'function')
  assert.equal(typeof module.createXMonitor, 'function')
  assert.equal(typeof module.listXInbox, 'function')
  assert.equal(typeof module.syncXFollowing, 'function')
  assert.equal(typeof module.syncAllXFollowing, 'function')
  assert.equal(typeof module.getXFollowingStatus, 'function')
  assert.equal(typeof module.searchXFollowing, 'function')
  assert.equal(typeof module.getXFollowingProfile, 'function')
  assert.equal(typeof module.createXArticleMonitor, 'function')
  assert.equal(typeof module.refreshXArticleMonitor, 'function')
  assert.equal(typeof module.searchXArticles, 'function')
  assert.equal(typeof module.getXArticle, 'function')
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

test('CLI exposes research, article, inbox, reply, and image commands', () => {
  const x = spawnSync(process.execPath, ['dist/cli.js', 'x', '--help'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  })
  assert.equal(x.status, 0, x.stderr)
  assert.match(x.stdout, /following/)
  assert.match(x.stdout, /monitors/)
  assert.match(x.stdout, /inbox/)
  assert.match(x.stdout, /articles/)

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

  const following = spawnSync(
    process.execPath,
    ['dist/cli.js', 'x', 'following', '--help'],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
    },
  )
  assert.equal(following.status, 0, following.stderr)
  assert.match(following.stdout, /sync/)
  assert.match(following.stdout, /status/)
  assert.match(following.stdout, /search/)
  assert.match(following.stdout, /profile/)

  const followingSearch = spawnSync(
    process.execPath,
    ['dist/cli.js', 'x', 'following', 'search', '--help'],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
    },
  )
  assert.equal(followingSearch.status, 0, followingSearch.stderr)
  assert.match(followingSearch.stdout, /--query/)
  assert.match(followingSearch.stdout, /--limit/)
  assert.match(followingSearch.stdout, /--csv/)

  const inbox = spawnSync(
    process.execPath,
    ['dist/cli.js', 'x', 'inbox', 'list', '--help'],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
    },
  )
  assert.equal(inbox.status, 0, inbox.stderr)
  assert.match(inbox.stdout, /--verified/)
  assert.match(inbox.stdout, /--follows-me/)
  assert.match(inbox.stdout, /--i-follow/)

  const articles = spawnSync(
    process.execPath,
    ['dist/cli.js', 'x', 'articles', '--help'],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
    },
  )
  assert.equal(articles.status, 0, articles.stderr)
  assert.match(articles.stdout, /add/)
  assert.match(articles.stdout, /refresh/)
  assert.match(articles.stdout, /search/)
  assert.match(articles.stdout, /show/)

  const articleRefresh = spawnSync(
    process.execPath,
    ['dist/cli.js', 'x', 'articles', 'refresh', '--help'],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
    },
  )
  assert.equal(articleRefresh.status, 0, articleRefresh.stderr)
  assert.match(articleRefresh.stdout, /\[MONITOR\]/)
  assert.doesNotMatch(articleRefresh.stdout, /MONITOR.*\(Required\)/)

  const post = spawnSync(process.execPath, ['dist/cli.js', 'post', '--help'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  })
  assert.equal(post.status, 0, post.stderr)
  assert.match(post.stdout, /--reply-to/)
  assert.match(post.stdout, /--image/)
})

test('CLI and public library share the local X inbox', async () => {
  const iloHome = await mkdtemp(join(tmpdir(), 'ilo-package-inbox-'))
  const databasePath = join(iloHome, 'ilo.sqlite')
  try {
    const module = await import('../dist/index.js')
    const monitor = module.createXMonitor({
      accountHandle: 'ilodotso',
      name: 'ilo mentions',
      query: '"ilo" OR "ilo.so"',
      databasePath,
    })
    await module.refreshXMonitor(
      { id: monitor.id, databasePath },
      {
        search: async () => ({
          posts: [
            {
              type: 'status',
              id: '123456789',
              url: 'https://x.com/adamwathan/status/123456789',
              text: 'Is there a tool that can search my followers?',
              created_at: 'Thu Jul 16 08:00:00 +0000 2026',
              likes: 125,
              reposts: 12,
              quotes: 3,
              replies: 42,
              views: 20_000,
              author: {
                id: 'adam-id',
                name: 'Adam Wathan',
                screen_name: 'adamwathan',
                description: 'Building things',
                followers: 294_202,
                verification: { verified: true, type: 'blue' },
              },
            },
          ],
          nextCursor: null,
        }),
      },
    )

    const list = spawnSync(
      process.execPath,
      ['dist/cli.js', 'x', 'inbox', 'list', '--account', 'ilodotso', '--json'],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        env: { ...process.env, ILO_HOME: iloHome },
      },
    )
    assert.equal(list.status, 0, list.stderr)
    const inbox = JSON.parse(list.stdout)
    assert.equal(inbox.items.length, 1)
    assert.equal(inbox.items[0].author.handle, 'adamwathan')
    assert.equal(inbox.items[0].author.verified, true)
    assert.equal(inbox.items[0].relationship.followsMe, null)
    assert.equal(inbox.items[0].relationship.iFollow, null)

    const draft = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'x',
        'inbox',
        'draft',
        '123456789',
        '--account',
        'ilodotso',
        '--text',
        'A local reply draft',
        '--json',
      ],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        env: { ...process.env, ILO_HOME: iloHome },
      },
    )
    assert.equal(draft.status, 0, draft.stderr)
    const drafted = JSON.parse(draft.stdout)
    assert.equal(drafted.draft.replyToPostId, '123456789')
    assert.equal(drafted.draft.status, 'draft')
    assert.equal(drafted.draft.publishedPostId, null)

    const archive = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'x',
        'inbox',
        'archive',
        '123456789',
        '--account',
        'ilodotso',
        '--json',
      ],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        env: { ...process.env, ILO_HOME: iloHome },
      },
    )
    assert.equal(archive.status, 0, archive.stderr)
    assert.ok(JSON.parse(archive.stdout).item.state.archivedAt)
  } finally {
    await rm(iloHome, { recursive: true, force: true })
  }
})

test('CLI and public library share monitored X articles', async () => {
  const iloHome = await mkdtemp(join(tmpdir(), 'ilo-package-articles-'))
  const databasePath = join(iloHome, 'ilo.sqlite')
  try {
    const module = await import('../dist/index.js')
    const monitor = module.createXArticleMonitor({
      accountHandle: 'ilodotso',
      sourceHandle: 'swyx',
      databasePath,
    })
    const articlePost = {
      type: 'status',
      id: '987654321',
      url: 'https://x.com/swyx/status/987654321',
      text: '',
      created_at: 'Thu Jul 16 08:00:00 +0000 2026',
      likes: 20,
      reposts: 5,
      quotes: 1,
      replies: 3,
      author: {
        id: 'swyx-id',
        name: 'Shawn Wang',
        screen_name: 'swyx',
        description: 'Writes technical articles',
      },
      article: {
        id: 'article-987654321',
        title: 'Building browser tools',
        preview_text: 'A practical article about browser automation.',
        created_at: '2026-07-16T08:00:00.000Z',
        content: {
          blocks: [
            {
              key: 'body',
              type: 'unstyled',
              text: 'The complete article body about browser automation.',
            },
          ],
          entityMap: [],
        },
      },
    }
    await module.refreshXArticleMonitor(
      { id: monitor.id, databasePath },
      {
        articles: async () => ({
          posts: [
            {
              ...articlePost,
              article: {
                ...articlePost.article,
                content: { blocks: [], entityMap: [] },
              },
            },
          ],
          nextCursor: null,
        }),
        status: async () => articlePost,
      },
    )

    const search = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'x',
        'articles',
        'search',
        '--account',
        'ilodotso',
        '--query',
        'browser automation',
        '--json',
      ],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        env: { ...process.env, ILO_HOME: iloHome },
      },
    )
    assert.equal(search.status, 0, search.stderr)
    const searched = JSON.parse(search.stdout)
    assert.equal(searched.articles.length, 1)
    assert.equal(searched.articles[0].postId, '987654321')
    assert.match(searched.articles[0].excerpt, /browser automation/)
    assert.equal(searched.articles[0].bodyText, undefined)

    const show = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'x',
        'articles',
        'show',
        '987654321',
        '--account',
        'ilodotso',
        '--json',
      ],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        env: { ...process.env, ILO_HOME: iloHome },
      },
    )
    assert.equal(show.status, 0, show.stderr)
    const shown = JSON.parse(show.stdout)
    assert.match(shown.article.bodyText, /complete article body/)
    assert.equal(shown.article.providerData.id, '987654321')
  } finally {
    await rm(iloHome, { recursive: true, force: true })
  }
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
    assert.match(humanOutput, /Matching profiles/)
    assert.match(humanOutput, /@follower/)
    assert.match(humanOutput, /Match counts/)
    assert.match(humanOutput, /vercel · 1 profile found/)
    assert.match(humanOutput, /1 current · 0 former · 0 unclear/)

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
    assert.match(
      statusResult.stdout,
      /stopped after repeated pages returned no new profiles/,
    )
    assert.match(statusResult.stdout, /follower profiles are searchable/)
  } finally {
    await rm(iloHome, { recursive: true, force: true })
  }
})

test('CLI and public library share complete following profiles', async () => {
  const iloHome = await mkdtemp(join(tmpdir(), 'ilo-package-following-'))
  const databasePath = join(iloHome, 'ilo.sqlite')
  try {
    const module = await import('../dist/index.js')
    await module.syncXFollowing(
      { handle: 'subject', maxPages: 1, databasePath },
      {
        profile: async () => ({
          id: 'subject-id',
          name: 'Subject',
          screen_name: 'subject',
          following: 2,
        }),
        following: async () => ({
          profiles: [
            {
              id: 'browser-id',
              name: 'Browser Builder',
              screen_name: 'browser_builder',
              description: 'Building browser tools for designers',
              location: 'London',
              followers: 1_200,
              statuses: 800,
              website: {
                url: 'https://browser.tools',
                display_url: 'browser.tools',
              },
            },
            {
              id: 'database-id',
              name: 'Database Builder',
              screen_name: 'database_builder',
              description: 'Building database infrastructure',
            },
          ],
          nextCursor: null,
        }),
      },
    )

    const searchResult = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'x',
        'following',
        'search',
        'subject',
        '--query',
        'building browser tools',
        '--json',
      ],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        env: { ...process.env, ILO_HOME: iloHome },
      },
    )
    assert.equal(searchResult.status, 0, searchResult.stderr)
    const search = JSON.parse(searchResult.stdout)
    assert.equal(search.totalMatches, 1)
    assert.equal(search.resultLimit, null)
    assert.equal(search.results[0].handle, 'browser_builder')
    assert.equal(search.results[0].location, 'London')
    assert.equal(search.coverage.complete, true)

    const profileResult = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'x',
        'following',
        'profile',
        'browser_builder',
        '--account',
        'subject',
        '--json',
      ],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        env: { ...process.env, ILO_HOME: iloHome },
      },
    )
    assert.equal(profileResult.status, 0, profileResult.stderr)
    const profile = JSON.parse(profileResult.stdout)
    assert.equal(profile.profile.posts, 800)
    assert.equal(profile.profile.websiteDisplayUrl, 'browser.tools')
    assert.equal(profile.profile.providerData.id, 'browser-id')

    const csvPath = join(iloHome, 'exports', 'browser-builders.csv')
    const csvResult = spawnSync(
      process.execPath,
      [
        'dist/cli.js',
        'x',
        'following',
        'search',
        'subject',
        '--query',
        'building browser tools',
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
    assert.equal(JSON.parse(csvResult.stdout).csvExport.rows, 1)
    const csv = await readFile(csvPath, 'utf8')
    assert.match(csv, /^"query","evidence","id"/)
    assert.match(csv, /"browser_builder"/)
    assert.match(csv, /"source_stale"/)
  } finally {
    await rm(iloHome, { recursive: true, force: true })
  }
})
