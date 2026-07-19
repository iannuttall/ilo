import assert from 'node:assert/strict'
import test from 'node:test'
import { stripVTControlCharacters } from 'node:util'
import type { XInboxItem, XInboxResultItem, XMonitor } from '@ilo/core'
import { renderXInbox } from './inbox-output.js'
import { renderMonitors } from './monitors.js'

const item: XInboxItem = {
  postId: '123',
  url: 'https://x.com/adamwathan/status/123',
  text: 'Is there a tool that can search my followers and tell me who works at a few specific companies?',
  createdAt: Date.now() - 60_000,
  language: 'en',
  likes: 125,
  reposts: 12,
  quotes: 3,
  replies: 42,
  views: 20_000,
  bookmarks: 9,
  replyingToPostId: null,
  author: {
    id: '1',
    handle: 'adamwathan',
    name: 'Adam Wathan',
    bio: 'Building things',
    avatarUrl: null,
    followers: 294_202,
    following: 800,
    verified: true,
    verificationType: 'blue',
  },
  relationship: {
    followsMe: true,
    iFollow: null,
    followerIndexComplete: false,
    followingIndexComplete: null,
  },
  state: { readAt: null, archivedAt: null, repliedAt: null },
  monitors: [{ id: 'monitor', name: 'ilo mentions', query: 'ilo' }],
  firstSeenAt: Date.now(),
  lastSeenAt: Date.now(),
  providerData: null,
}

test('uses stacked inbox items in a normal-width terminal', () => {
  const output = stripVTControlCharacters(renderXInbox('ilodotso', [item], 96))

  assert.match(output, /new · 1m · ilo mentions/)
  assert.match(output, /Adam Wathan @adamwathan · 294K followers/)
  assert.match(output, /verified · follows you · you follow: unknown/)
  assert.doesNotMatch(output, /State\s+│\s+Account/)
  assert.ok(
    output.split('\n').every((line) => line.length <= 96),
    output,
  )
})

test('keeps the wide inbox table inside the terminal width', () => {
  const output = stripVTControlCharacters(renderXInbox('ilodotso', [item], 160))

  assert.match(output, /State\s+│\s+Account\s+│\s+Signals/)
  assert.ok(
    output.split('\n').every((line) => line.length <= 156),
    output,
  )
})

test('shows signal scores and their strongest factors when requested', () => {
  const ranked: XInboxResultItem = {
    ...item,
    signal: {
      score: 82,
      confidence: 'high',
      modelVersion: 'signal-v1',
      factors: [
        {
          key: 'first-hand',
          label: 'Describes first-hand work or evidence',
          impact: 5,
        },
        {
          key: 'promotion',
          label: 'Uses promotional or engagement-bait wording',
          impact: -3,
        },
      ],
      reasons: ['Describes first-hand work or evidence'],
      penalties: ['Uses promotional or engagement-bait wording'],
      duplicateOfPostId: null,
      feedback: null,
    },
  }
  const output = stripVTControlCharacters(
    renderXInbox('ilodotso', [ranked], 96, true),
  )

  assert.match(output, /signal 82 \(high confidence\)/)
  assert.match(output, /\+5 Describes first-hand work or evidence/)
  assert.match(output, /-3 Uses promotional or engagement-bait wording/)
  assert.ok(
    output.split('\n').every((line) => line.length <= 96),
    output,
  )
})

test('uses stacked monitors in a normal-width terminal', () => {
  const monitor: XMonitor = {
    id: '12345678-1234-1234-1234-123456789012',
    accountHandle: 'ilodotso',
    name: 'ilo mentions',
    query: '"ilo" OR "ilo.so" -is:retweet',
    enabled: true,
    newestPostId: null,
    createdAt: 1,
    updatedAt: 1,
    lastCheckedAt: null,
    lastError: null,
  }
  const output = stripVTControlCharacters(renderMonitors([monitor], 96))

  assert.match(output, /active · ilo mentions · 12345678/)
  assert.match(output, /"ilo" OR "ilo\.so" -is:retweet/)
  assert.doesNotMatch(output, /Status\s+│\s+Name/)
  assert.ok(
    output.split('\n').every((line) => line.length <= 96),
    output,
  )
})
