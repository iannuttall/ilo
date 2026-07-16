import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import type {
  FxTwitterStatus,
  FxTwitterUser,
} from '../providers/x/fxtwitter.js'
import { syncXFollowers } from './followers.js'
import { syncXFollowing } from './following.js'
import {
  createXMonitor,
  getXInboxItem,
  listXInbox,
  listXMonitors,
  refreshXInbox,
  refreshXMonitor,
  setXMonitorEnabled,
  updateXInboxItem,
} from './inbox.js'

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

const status = (
  id: string,
  author: FxTwitterUser,
  text: string,
): FxTwitterStatus => ({
  type: 'status',
  id,
  url: `https://x.com/${author.screen_name}/status/${id}`,
  text,
  created_at: 'Wed Jul 16 07:00:00 +0000 2026',
  created_timestamp: Number(id),
  likes: 3,
  reposts: 1,
  quotes: 0,
  replies: 2,
  views: 100,
  author,
})

test('refreshes a local monitor and filters its inbox with tri-state relationships', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-inbox-'))
  const databasePath = join(directory, 'ilo.sqlite')
  const account = profile('account-id', 'owner', {
    followers: 3,
    following: 3,
  })
  const known = profile('known-id', 'known', {
    description: 'Building useful software',
    followers: 500,
    following: 100,
    verification: { verified: true, type: 'blue' },
  })
  const unknown = profile('unknown-id', 'unknown', {
    description: 'Asking good questions',
    followers: 50,
    following: 25,
  })
  const other = profile('other-id', 'other')

  const followerClient = {
    profile: async () => account,
    followers: async (_handle: string, input: { cursor: string | null }) =>
      input.cursor
        ? { profiles: [other], nextCursor: null }
        : { profiles: [known], nextCursor: 'followers-next' },
  }
  const followingClient = {
    profile: async () => account,
    following: async (_handle: string, input: { cursor: string | null }) =>
      input.cursor
        ? { profiles: [other], nextCursor: null }
        : { profiles: [known], nextCursor: 'following-next' },
  }

  try {
    const partialFollowers = await syncXFollowers(
      { handle: 'owner', maxPages: 1, databasePath },
      followerClient,
    )
    const partialFollowing = await syncXFollowing(
      { handle: 'owner', maxPages: 1, databasePath },
      followingClient,
    )
    assert.equal(partialFollowers.complete, false)
    assert.equal(partialFollowing.complete, false)

    const monitor = createXMonitor({
      accountHandle: 'owner',
      name: 'Product questions',
      query: '"ilo" OR @owner',
      databasePath,
    })
    const posts = [
      status('200', known, 'Has anyone used ilo for X research?'),
      status('199', unknown, 'Looking for a local social inbox'),
    ]
    const searchClient = {
      search: async () => ({ posts, nextCursor: null }),
    }
    const firstRefresh = await refreshXMonitor(
      { id: monitor.id, databasePath },
      searchClient,
    )
    assert.equal(firstRefresh.newItems, 2)
    assert.equal(firstRefresh.newMatches, 2)
    assert.equal(firstRefresh.truncated, false)

    const partialInbox = listXInbox({
      accountHandle: 'owner',
      databasePath,
    })
    assert.equal(partialInbox.length, 2)
    assert.deepEqual(partialInbox[0]?.relationship, {
      followsMe: true,
      iFollow: true,
      followerIndexComplete: false,
      followingIndexComplete: false,
    })
    assert.deepEqual(partialInbox[1]?.relationship, {
      followsMe: null,
      iFollow: null,
      followerIndexComplete: false,
      followingIndexComplete: false,
    })
    assert.equal(partialInbox[0]?.providerData?.id, '200')

    const verified = listXInbox({
      accountHandle: 'owner',
      verified: true,
      followsMe: true,
      iFollow: true,
      query: 'used ilo',
      databasePath,
    })
    assert.deepEqual(
      verified.map((item) => item.author.handle),
      ['known'],
    )

    await syncXFollowers(
      { handle: 'owner', maxPages: 1, databasePath },
      followerClient,
    )
    await syncXFollowing(
      { handle: 'owner', maxPages: 1, databasePath },
      followingClient,
    )
    const completeInbox = listXInbox({
      accountHandle: 'owner',
      databasePath,
    })
    assert.deepEqual(completeInbox[1]?.relationship, {
      followsMe: false,
      iFollow: false,
      followerIndexComplete: true,
      followingIndexComplete: true,
    })

    const read = updateXInboxItem({
      accountHandle: 'owner',
      postId: '199',
      action: 'read',
      databasePath,
    })
    assert.equal(typeof read.state.readAt, 'number')
    const archived = updateXInboxItem({
      accountHandle: 'owner',
      postId: '199',
      action: 'archive',
      databasePath,
    })
    assert.equal(typeof archived.state.archivedAt, 'number')
    assert.equal(listXInbox({ accountHandle: 'owner', databasePath }).length, 1)
    assert.equal(
      listXInbox({
        accountHandle: 'owner',
        status: 'archived',
        databasePath,
      })[0]?.postId,
      '199',
    )
    assert.equal(
      getXInboxItem({
        accountHandle: 'owner',
        postId: '199',
        databasePath,
      }).author.handle,
      'unknown',
    )

    const secondRefresh = await refreshXMonitor(
      { id: monitor.id, databasePath },
      searchClient,
    )
    assert.equal(secondRefresh.newItems, 0)
    assert.equal(secondRefresh.newMatches, 0)

    const disabled = setXMonitorEnabled({
      id: monitor.id,
      enabled: false,
      databasePath,
    })
    assert.equal(disabled.enabled, false)
    assert.equal(
      listXMonitors({
        accountHandle: 'owner',
        includeDisabled: true,
        databasePath,
      }).length,
      1,
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('refreshes every enabled monitor while retaining individual failures', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-inbox-refresh-'))
  const databasePath = join(directory, 'ilo.sqlite')
  try {
    createXMonitor({
      accountHandle: 'owner',
      name: 'Working',
      query: 'working query',
      databasePath,
    })
    createXMonitor({
      accountHandle: 'owner',
      name: 'Broken',
      query: 'broken query',
      databasePath,
    })
    const result = await refreshXInbox(
      { accountHandle: 'owner', databasePath },
      {
        search: async ({ query }) => {
          if (query.includes('broken')) throw new Error('upstream_broken')
          return { posts: [], nextCursor: null }
        },
      },
    )

    assert.equal(result.checked, 2)
    assert.equal(result.results.length, 1)
    assert.equal(result.failed.length, 1)
    assert.equal(result.failed[0]?.error, 'upstream_broken')
    assert.equal(
      listXMonitors({
        accountHandle: 'owner',
        includeDisabled: true,
        databasePath,
      }).find((monitor) => monitor.name === 'Broken')?.lastError,
      'upstream_broken',
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
