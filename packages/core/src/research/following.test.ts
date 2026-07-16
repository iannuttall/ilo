import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import type { FxTwitterUser } from '../providers/x/fxtwitter.js'
import {
  getXFollowingProfile,
  getXFollowingStatus,
  searchXFollowing,
  syncXFollowing,
  X_FOLLOWING_STALE_AFTER_MS,
} from './following.js'

const profile = (
  id: string,
  handle: string,
  input: Partial<FxTwitterUser> = {},
): FxTwitterUser => ({
  id,
  name: handle,
  screen_name: handle,
  ...input,
})

test('stores complete followed profiles and searches every local match', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-following-search-'))
  const databasePath = join(directory, 'ilo.sqlite')
  const owner = profile('owner-id', 'owner', { following: 3 })
  const browserBuilder = profile('browser-id', 'browser_builder', {
    name: 'Browser Builder',
    description: 'Building browser tools for designers',
    location: 'London',
    followers: 1_200,
    following: 240,
    statuses: 800,
    likes: 3_000,
    media_count: 75,
    joined: 'Mon Jan 02 00:00:00 +0000 2023',
    avatar_url: 'https://cdn.example/avatar.jpg',
    banner_url: 'https://cdn.example/banner.jpg',
    website: {
      url: 'https://browser.tools',
      display_url: 'browser.tools',
    },
    verification: { verified: true, type: 'blue' },
  })
  const extensionAuthor = profile('extension-id', 'extension_author', {
    name: 'Extension Author',
    description: 'Browser extensions and developer tools',
    followers: 600,
  })
  const investor = profile('investor-id', 'seed_investor', {
    name: 'Seed Investor',
    description: 'Investing in developer infrastructure',
    location: 'San Francisco',
  })

  try {
    const state = await syncXFollowing(
      { handle: 'owner', maxPages: 1, databasePath },
      {
        profile: async () => owner,
        following: async () => ({
          profiles: [browserBuilder, extensionAuthor, investor],
          nextCursor: null,
        }),
      },
    )

    assert.equal(state.complete, true)
    assert.equal(state.completionReason, 'provider_end')
    assert.equal(state.importedProfiles, 3)
    assert.equal(state.searchableProfiles, 3)
    assert.equal(state.profileDataVersion, 1)

    const search = searchXFollowing({
      handle: 'owner',
      query: 'browser tools',
      databasePath,
      now: state.updatedAt + X_FOLLOWING_STALE_AFTER_MS + 1,
    })
    assert.equal(search.engine, 'sqlite_fts5')
    assert.equal(search.resultLimit, null)
    assert.equal(search.totalMatches, 2)
    assert.equal(search.truncated, false)
    assert.equal(search.coverage.complete, true)
    assert.equal(search.coverage.stale, true)
    assert.deepEqual(search.results.map((result) => result.handle).sort(), [
      'browser_builder',
      'extension_author',
    ])

    const limited = searchXFollowing({
      handle: 'owner',
      query: 'browser tools',
      resultLimit: 1,
      databasePath,
    })
    assert.equal(limited.totalMatches, 2)
    assert.equal(limited.results.length, 1)
    assert.equal(limited.truncated, true)

    const stored = getXFollowingProfile({
      handle: 'owner',
      followedHandle: 'browser_builder',
      databasePath,
    })
    assert.equal(stored.profile.bio, browserBuilder.description)
    assert.equal(stored.profile.location, 'London')
    assert.equal(stored.profile.websiteUrl, 'https://browser.tools')
    assert.equal(stored.profile.bannerUrl, 'https://cdn.example/banner.jpg')
    assert.equal(stored.profile.providerData?.id, 'browser-id')
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('resumes unfinished following imports and refreshes completed snapshots', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-following-refresh-'))
  const databasePath = join(directory, 'ilo.sqlite')
  const owner = profile('owner-id', 'owner', { following: 2 })
  const first = profile('first-id', 'first', {
    description: 'Building browser tools',
  })
  const second = profile('second-id', 'second', {
    description: 'Building command line tools',
  })
  const replacement = profile('replacement-id', 'replacement', {
    description: 'Building browser tools',
  })
  let snapshot = 1

  const client = {
    profile: async () => owner,
    following: async (_handle: string, input: { cursor: string | null }) => {
      if (snapshot === 2) {
        return { profiles: [second, replacement], nextCursor: null }
      }
      return input.cursor
        ? { profiles: [second], nextCursor: null }
        : { profiles: [first], nextCursor: 'next-page' }
    },
  }

  try {
    const partial = await syncXFollowing(
      { handle: 'owner', maxPages: 1, databasePath },
      client,
    )
    assert.equal(partial.complete, false)
    assert.equal(partial.completionReason, null)
    assert.equal(partial.searchableProfiles, 1)
    assert.deepEqual(
      searchXFollowing({
        handle: 'owner',
        query: 'browser',
        databasePath,
      }).results.map((result) => result.handle),
      ['first'],
    )

    const complete = await syncXFollowing(
      { handle: 'owner', maxPages: 1, databasePath },
      client,
    )
    assert.equal(complete.complete, true)
    assert.equal(complete.completionReason, 'provider_end')
    assert.equal(complete.importedProfiles, 2)

    snapshot = 2
    const refreshed = await syncXFollowing(
      { handle: 'owner', maxPages: 1, databasePath },
      client,
    )
    assert.equal(refreshed.complete, true)
    assert.notEqual(refreshed.syncId, complete.syncId)
    assert.deepEqual(
      searchXFollowing({
        handle: 'owner',
        query: 'browser',
        databasePath,
      }).results.map((result) => result.handle),
      ['replacement'],
    )
    assert.equal(
      getXFollowingStatus({
        handle: 'owner',
        databasePath,
        now: refreshed.updatedAt + 60_000,
      })?.stale,
      false,
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('confirms completion when the reported count is followed by duplicate pages', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-following-count-'))
  const databasePath = join(directory, 'ilo.sqlite')
  const owner = profile('owner-id', 'owner', { following: 2 })
  const first = profile('first-id', 'first', {
    description: 'Building browser tools',
  })
  const second = profile('second-id', 'second', {
    description: 'Building command line tools',
  })
  let calls = 0

  try {
    const state = await syncXFollowing(
      { handle: 'owner', maxPages: 10, databasePath },
      {
        profile: async () => owner,
        following: async () => {
          calls += 1
          return {
            profiles: [first, second],
            nextCursor: `cursor-${calls}`,
          }
        },
      },
    )

    assert.equal(calls, 4)
    assert.equal(state.complete, true)
    assert.equal(state.completionReason, 'reported_count_confirmed')
    assert.equal(state.cursor, null)
    assert.equal(state.importedProfiles, 2)
    assert.equal(state.lastError, null)
    assert.equal(
      searchXFollowing({
        handle: 'owner',
        query: 'building',
        databasePath,
      }).coverage.completionReason,
      'reported_count_confirmed',
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
