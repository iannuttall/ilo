import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import type { FxTwitterUser } from '../providers/x/fxtwitter.js'
import {
  buildProfileAliases,
  classifyFollowerMatch,
  type FollowerResearchClient,
  getXFollowerProfile,
  getXFollowersStatus,
  parseFollowerSearchTerms,
  searchXFollowers,
  syncXFollowers,
  X_FOLLOWER_NO_PROGRESS_PAGE_LIMIT,
} from './followers.js'

const profile = (
  id: string,
  screenName: string,
  description: string,
  followers = 100,
): FxTwitterUser => ({
  id,
  name: screenName,
  screen_name: screenName,
  description,
  followers,
})

test('parses natural employer questions and pipe-separated alternatives', () => {
  assert.deepEqual(
    parseFollowerSearchTerms(
      'how many of my followers work at cursor|vercel|sentry?',
    ),
    ['cursor', 'vercel', 'sentry'],
  )
})

test('labels explicit current and former employment conservatively', () => {
  assert.equal(
    classifyFollowerMatch(
      { bio: 'GTM @vercel', name: 'S', handle: 's' },
      'vercel',
    ),
    'current',
  )
  assert.equal(
    classifyFollowerMatch(
      { bio: 'Software Engineer @getsentry', name: 'D', handle: 'd' },
      'sentry',
    ),
    'current',
  )
  assert.equal(
    classifyFollowerMatch(
      { bio: 'Ex-@vercel. Building now.', name: 'M', handle: 'm' },
      'vercel',
    ),
    'former',
  )
  assert.equal(
    classifyFollowerMatch(
      { bio: 'I like Vercel and Svelte', name: 'U', handle: 'u' },
      'vercel',
    ),
    'unclear',
  )
  assert.equal(
    classifyFollowerMatch(
      { bio: 'Building websites with Vercel', name: 'B', handle: 'b' },
      'vercel',
    ),
    'unclear',
  )
  assert.equal(
    classifyFollowerMatch(
      {
        bio: 'Dev studio for startups (worked with @cursor_ai)',
        name: 'C',
        handle: 'c',
      },
      'cursor',
    ),
    'unclear',
  )
  assert.equal(
    classifyFollowerMatch(
      { bio: 'Founder of Cursor Community', name: 'C', handle: 'c' },
      'cursor',
    ),
    'unclear',
  )
  assert.equal(
    classifyFollowerMatch(
      { bio: '@cursor_ai ambassador', name: 'C', handle: 'c' },
      'cursor',
    ),
    'unclear',
  )
  assert.equal(
    classifyFollowerMatch(
      {
        bio: 'Designing Claude Code @anthropicai. Prev @v0 @vercel @graphite.',
        name: 'P',
        handle: 'p',
      },
      'vercel',
    ),
    'former',
  )
  assert.equal(
    classifyFollowerMatch(
      {
        bio: 'Eng at @xai, prev design engineer @sentry.',
        name: 'J',
        handle: 'j',
      },
      'sentry',
    ),
    'former',
  )
  assert.equal(
    classifyFollowerMatch(
      {
        bio: 'SDKs at @posthog. Prev. Mobile at @getsentry',
        name: 'M',
        handle: 'm',
      },
      'sentry',
    ),
    'former',
  )
  assert.equal(
    classifyFollowerMatch(
      { bio: 'Eng at @cursor_ai', name: 'E', handle: 'e' },
      'cursor',
    ),
    'current',
  )
  assert.equal(
    classifyFollowerMatch(
      {
        bio: 'Building AI agents for debugging at @sentry.',
        name: 'A',
        handle: 'a',
      },
      'sentry',
    ),
    'current',
  )
  assert.equal(
    classifyFollowerMatch(
      {
        bio: 'CEO of @onlookdev, the open-source Cursor for Designers.',
        name: 'O',
        handle: 'o',
      },
      'cursor',
    ),
    'unclear',
  )
  assert.equal(
    classifyFollowerMatch(
      {
        bio: 'Founder of acquired @SureVoIP and @SentryPeer.',
        name: 'S',
        handle: 's',
      },
      'sentry',
    ),
    'unclear',
  )
  assert.equal(
    classifyFollowerMatch(
      {
        bio: 'Eng at @xai, prev design engineer @sentry. Built profiling at Sentry.',
        name: 'J',
        handle: 'j',
      },
      'sentry',
    ),
    'former',
  )
  assert.equal(
    classifyFollowerMatch(
      {
        bio: 'Previously @vercel. Now back as an engineer @vercel.',
        name: 'V',
        handle: 'v',
      },
      'vercel',
    ),
    'current',
  )
  assert.equal(
    classifyFollowerMatch(
      {
        bio: 'Eng at @cursor_ai; prev CTO @getkoala_com (acquired by Cursor).',
        name: 'N',
        handle: 'n',
      },
      'cursor',
    ),
    'current',
  )
  assert.equal(
    classifyFollowerMatch(
      {
        bio: 'Former Cursor subscriber. Built for Cursor builders.',
        name: 'S',
        handle: 's',
      },
      'cursor',
    ),
    'unclear',
  )
  assert.equal(
    classifyFollowerMatch(
      {
        bio: 'React components. Vercel OSS Program participant.',
        name: 'P',
        handle: 'p',
      },
      'vercel',
    ),
    'unclear',
  )
})

test('normalizes company handles without treating hosted websites as employers', () => {
  const aliases = buildProfileAliases({
    id: '1',
    name: 'D',
    screen_name: 'developer',
    description: 'Software Engineer @getsentry',
    website: {
      url: 'https://example.vercel.app',
      display_url: 'example.vercel.app',
    },
  })
  assert.match(aliases, /sentry/)
  assert.doesNotMatch(aliases, /vercel/)
})

test('resumes follower syncs and searches normalized company handles', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-followers-'))
  const databasePath = join(directory, 'ilo.sqlite')
  const pages = new Map([
    [
      '',
      {
        profiles: [
          {
            ...profile('1', 'leerob', 'Model behavior @cursor_ai', 250_000),
            avatar_url: 'https://images.example/avatar.jpg',
            banner_url: 'https://images.example/banner.jpg',
            following: 500,
            statuses: 12_000,
            likes: 8_000,
            media_count: 900,
            joined: 'Mon Jan 01 00:00:00 +0000 2018',
            location: 'San Francisco, CA',
            protected: false,
            verification: { verified: true, type: 'individual' },
            website: {
              url: 'https://example.com',
              display_url: 'example.com',
            },
          },
          profile('2', 'matt', 'Ex-@vercel. Teaching TypeScript.', 200_000),
        ],
        nextCursor: 'page-2',
      },
    ],
    [
      'page-2',
      {
        profiles: [
          profile('3', 'rich', 'I work on @sveltejs at @vercel', 90_000),
          profile('4', 'dominik', 'Software Engineer @getsentry', 50_000),
        ],
        nextCursor: null,
      },
    ],
  ])
  let followerRequests = 0
  const client: FollowerResearchClient = {
    profile: async () =>
      profile('adam-id', 'adamwathan', 'Creator of Tailwind CSS', 4),
    followers: async (_handle, input) => {
      followerRequests += 1
      const page = pages.get(input.cursor ?? '')
      if (!page) throw new Error('missing_test_page')
      return page
    },
  }

  try {
    const partial = await syncXFollowers(
      { handle: 'adamwathan', maxPages: 1, databasePath },
      client,
    )
    assert.equal(partial.complete, false)
    assert.equal(partial.importedProfiles, 2)

    const complete = await syncXFollowers(
      { handle: 'adamwathan', maxPages: 1, databasePath },
      client,
    )
    assert.equal(complete.complete, true)
    assert.equal(complete.importedProfiles, 4)
    assert.equal(followerRequests, 2)

    const result = searchXFollowers({
      handle: '@adamwathan',
      query: 'who works at cursor|vercel|sentry?',
      databasePath,
    })
    assert.equal(result.coverage.complete, true)
    assert.deepEqual(
      result.groups.map((group) => ({
        term: group.term,
        current: group.current,
        former: group.former,
      })),
      [
        { term: 'cursor', current: 1, former: 0 },
        { term: 'vercel', current: 1, former: 1 },
        { term: 'sentry', current: 1, former: 0 },
      ],
    )
    assert.equal(result.groups[2]?.results[0]?.handle, 'dominik')

    const fullProfile = getXFollowerProfile({
      handle: 'adamwathan',
      followerHandle: '@leerob',
      databasePath,
    })
    assert.equal(
      fullProfile.profile.bannerUrl,
      'https://images.example/banner.jpg',
    )
    assert.equal(fullProfile.profile.posts, 12_000)
    assert.equal(fullProfile.profile.likes, 8_000)
    assert.equal(fullProfile.profile.mediaCount, 900)
    assert.equal(fullProfile.profile.joinedAt, 'Mon Jan 01 00:00:00 +0000 2018')
    assert.equal(fullProfile.profile.websiteDisplayUrl, 'example.com')
    assert.equal(fullProfile.profile.verificationType, 'individual')
    assert.equal(fullProfile.profile.providerData?.screen_name, 'leerob')

    const alreadyComplete = await syncXFollowers(
      { handle: 'adamwathan', maxPages: 1, databasePath },
      client,
    )
    assert.equal(alreadyComplete.complete, true)
    assert.equal(followerRequests, 2)

    const refreshing = await syncXFollowers(
      { handle: 'adamwathan', maxPages: 1, databasePath, restart: true },
      client,
    )
    assert.equal(refreshing.complete, false)
    assert.equal(refreshing.importedProfiles, 2)
    const refreshSearch = searchXFollowers({
      handle: 'adamwathan',
      query: 'sentry',
      databasePath,
    })
    assert.equal(refreshSearch.groups[0]?.candidates, 0)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('stops when changing cursors only return duplicate follower pages', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-followers-stalled-'))
  const databasePath = join(directory, 'ilo.sqlite')
  let followerRequests = 0
  const duplicate = profile('1', 'repeat', 'Repeated profile')
  const client: FollowerResearchClient = {
    profile: async () =>
      profile('subject-id', 'subject', 'Subject profile', 100),
    followers: async () => {
      followerRequests += 1
      return {
        profiles: [duplicate],
        nextCursor: `cursor-${followerRequests}`,
      }
    },
  }

  try {
    await assert.rejects(
      syncXFollowers(
        {
          handle: 'subject',
          maxPages: 100,
          databasePath,
        },
        client,
      ),
      /fxtwitter_follower_sync_no_progress/,
    )
    assert.equal(followerRequests, X_FOLLOWER_NO_PROGRESS_PAGE_LIMIT + 1)

    const state = getXFollowersStatus({ handle: 'subject', databasePath })
    assert.equal(state?.complete, false)
    assert.equal(state?.importedProfiles, 1)
    assert.equal(state?.pagesFetched, X_FOLLOWER_NO_PROGRESS_PAGE_LIMIT + 1)
    assert.equal(state?.lastError, 'fxtwitter_follower_sync_no_progress')
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
