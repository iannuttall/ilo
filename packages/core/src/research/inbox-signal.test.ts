import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  FxTwitterStatus,
  FxTwitterUser,
} from '../providers/x/fxtwitter.js'
import type { XInboxItem } from '../storage/inbox.js'
import type { XInboxFeedbackEvidence } from '../storage/inbox-feedback.js'
import { rankXInbox, X_INBOX_SIGNAL_MODEL_VERSION } from './inbox-signal.js'

const now = Date.UTC(2026, 6, 19, 12)

const makeItem = (
  postId: string,
  input: Omit<Partial<XInboxItem>, 'author'> & {
    author?: Partial<XInboxItem['author']>
    rawAuthor?: Partial<FxTwitterUser>
  } = {},
): XInboxItem => {
  const author = {
    id: `author-${postId}`,
    handle: `author_${postId}`,
    name: `Author ${postId}`,
    bio: 'Researcher building useful software',
    avatarUrl: null,
    followers: 1_000,
    following: 200,
    verified: false,
    verificationType: null,
    ...input.author,
  }
  const providerData: FxTwitterStatus = {
    type: 'status',
    id: postId,
    url: `https://x.com/${author.handle}/status/${postId}`,
    text: input.text ?? 'A detailed technical finding with useful evidence',
    created_at: new Date(input.createdAt ?? now - 3_600_000).toISOString(),
    created_timestamp: input.createdAt ?? now - 3_600_000,
    likes: input.likes ?? 10,
    reposts: input.reposts ?? 2,
    quotes: input.quotes ?? 1,
    replies: input.replies ?? 3,
    views: input.views ?? 1_000,
    bookmarks: input.bookmarks ?? 2,
    lang: input.language ?? 'en',
    author: {
      id: author.id,
      name: author.name,
      screen_name: author.handle,
      description: author.bio,
      followers: author.followers ?? undefined,
      following: author.following ?? undefined,
      joined: 'Mon Jan 01 00:00:00 +0000 2020',
      ...input.rawAuthor,
    },
  }
  return {
    postId,
    url: providerData.url,
    text: providerData.text ?? '',
    createdAt: input.createdAt ?? now - 3_600_000,
    language: input.language === undefined ? 'en' : input.language,
    likes: input.likes ?? 10,
    reposts: input.reposts ?? 2,
    quotes: input.quotes ?? 1,
    replies: input.replies ?? 3,
    views: input.views === undefined ? 1_000 : input.views,
    bookmarks: input.bookmarks === undefined ? 2 : input.bookmarks,
    replyingToPostId: input.replyingToPostId ?? null,
    author,
    relationship: input.relationship ?? {
      followsMe: null,
      iFollow: null,
      followerIndexComplete: null,
      followingIndexComplete: null,
    },
    state: input.state ?? {
      readAt: null,
      archivedAt: null,
      repliedAt: null,
    },
    monitors: input.monitors ?? [
      { id: 'monitor', name: 'AI research', query: 'AI research' },
    ],
    firstSeenAt: input.firstSeenAt ?? now,
    lastSeenAt: input.lastSeenAt ?? now,
    providerData:
      input.providerData === undefined ? providerData : input.providerData,
  }
}

const feedback = (
  postId: string,
  authorId: string,
  value: XInboxFeedbackEvidence['value'],
): XInboxFeedbackEvidence => ({
  accountHandle: 'owner',
  postId,
  authorId,
  value,
  reason: value === 'useful' ? 'actionable' : 'irrelevant',
  note: null,
  createdAt: now,
  updatedAt: now,
})

test('ranks specific first-hand work above large promotional accounts', () => {
  const useful = makeItem('useful', {
    text: 'We tested 14 models and published the benchmark code https://github.com/example/bench',
    likes: 120,
    reposts: 25,
    quotes: 8,
    replies: 12,
    views: 5_000,
    author: { followers: 500, following: 100 },
  })
  const noisy = makeItem('noisy', {
    text: 'Join my community. Limited time giveaway. Like and repost for more updates.',
    likes: 1_000,
    reposts: 100,
    replies: 20,
    views: 200_000,
    author: { followers: 500_000, following: 500, verified: true },
  })

  const ranked = rankXInbox({ items: [noisy, useful], now })
  const [first, second] = ranked
  assert.ok(first && second)

  assert.equal(first.postId, 'useful')
  assert.ok(first.signal.score > second.signal.score)
  assert.equal(
    first.signal.factors.some((factor) => factor.key === 'first-hand'),
    true,
  )
  assert.match(second.signal.penalties.join(' '), /promotional/i)
})

test('normalizes response by visible views instead of rewarding raw likes', () => {
  const efficient = makeItem('efficient', {
    likes: 80,
    reposts: 12,
    quotes: 4,
    replies: 16,
    views: 2_000,
    author: { followers: 800 },
  })
  const broad = makeItem('broad', {
    likes: 800,
    reposts: 30,
    quotes: 5,
    replies: 20,
    views: 300_000,
    author: { followers: 300_000 },
  })

  const ranked = rankXInbox({ items: [broad, efficient], now })
  const [first, second] = ranked
  assert.ok(first && second)

  assert.equal(first.postId, 'efficient')
  assert.ok(
    (first.signal.factors.find((factor) => factor.key === 'engagement-rate')
      ?.impact ?? 0) >
      (second.signal.factors.find((factor) => factor.key === 'engagement-rate')
        ?.impact ?? 0),
  )
})

test('keeps the strongest near-duplicate and explains the penalty', () => {
  const original = makeItem('original', {
    text: 'We published a detailed benchmark for five local coding models with all test data included',
    likes: 50,
    views: 2_000,
  })
  const copy = makeItem('copy', {
    text: 'Published a detailed benchmark for five local coding models with all test data included today',
    likes: 2,
    views: 2_000,
  })

  const ranked = rankXInbox({ items: [copy, original], now })
  const duplicate = ranked.find((item) => item.postId === 'copy')

  assert.equal(duplicate?.signal.duplicateOfPostId, 'original')
  assert.match(duplicate?.signal.penalties.join(' ') ?? '', /near-duplicate/i)
  assert.equal(ranked[0]?.postId, 'original')
})

test('uses known relationships as useful taste evidence', () => {
  const known = makeItem('known', {
    relationship: {
      followsMe: true,
      iFollow: true,
      followerIndexComplete: true,
      followingIndexComplete: true,
    },
  })
  const unknown = makeItem('unknown')

  const ranked = rankXInbox({ items: [unknown, known], now })

  assert.equal(ranked[0]?.postId, 'known')
  assert.match(ranked[0].signal.reasons.join(' '), /follow/i)
})

test('returns a finite score and low confidence when public data is sparse', () => {
  const sparse = makeItem('sparse', {
    text: 'Useful?',
    language: null,
    views: null,
    bookmarks: null,
    author: { followers: null, following: null, bio: '' },
    providerData: null,
  })

  const [ranked] = rankXInbox({ items: [sparse], now })
  assert.ok(ranked)

  assert.equal(Number.isFinite(ranked.signal.score), true)
  assert.equal(ranked.signal.confidence, 'low')
  assert.equal(ranked.signal.modelVersion, X_INBOX_SIGNAL_MODEL_VERSION)
})

test('learns a cautious source preference from prior feedback', () => {
  const preferred = makeItem('preferred', {
    author: { id: 'preferred-author' },
  })
  const ordinary = makeItem('ordinary', {
    author: { id: 'ordinary-author' },
  })
  const history = [
    feedback('old-1', 'preferred-author', 'useful'),
    feedback('old-2', 'preferred-author', 'useful'),
    feedback('old-3', 'ordinary-author', 'not_useful'),
  ]

  const ranked = rankXInbox({
    items: [ordinary, preferred],
    feedback: history,
    now,
  })
  const [first, second] = ranked
  assert.ok(first && second)

  assert.equal(first.postId, 'preferred')
  assert.match(first.signal.reasons.join(' '), /useful before/i)
  assert.match(second.signal.penalties.join(' '), /dismissed before/i)
})

test('direct feedback clearly changes the selected post without hiding evidence', () => {
  const selected = makeItem('selected')
  const dismissed = makeItem('dismissed', { likes: 30 })
  const history = [
    feedback('selected', selected.author.id, 'useful'),
    feedback('dismissed', dismissed.author.id, 'not_useful'),
  ]

  const ranked = rankXInbox({
    items: [dismissed, selected],
    feedback: history,
    now,
  })
  const [first, second] = ranked
  assert.ok(first && second)

  assert.equal(first.postId, 'selected')
  assert.equal(first.signal.feedback?.value, 'useful')
  assert.equal(first.signal.confidence, 'high')
  assert.match(second.signal.penalties.join(' '), /not useful/i)
  assert.ok(first.signal.factors.length > 1)
})

test('penalizes suspicious new high-volume follow patterns without calling them spam', () => {
  const suspicious = makeItem('suspicious', {
    author: { followers: 10, following: 2_000 },
    rawAuthor: {
      joined: 'Wed Jul 15 00:00:00 +0000 2026',
      statuses: 20_000,
    },
  })

  const [ranked] = rankXInbox({ items: [suspicious], now })
  assert.ok(ranked)
  const penalties = ranked.signal.penalties.join(' ')

  assert.match(penalties, /30 days|posting rate|far more accounts/i)
  assert.doesNotMatch(penalties, /spam/i)
})

test('uses freshness as a bounded signal', () => {
  const fresh = makeItem('fresh', {
    text: 'A current detailed finding about model evaluation methods',
    createdAt: now - 60_000,
  })
  const old = makeItem('old', {
    text: 'A historic detailed finding about database testing methods',
    createdAt: now - 60 * 86_400_000,
  })

  const ranked = rankXInbox({ items: [old, fresh], now })
  const [first, second] = ranked
  assert.ok(first && second)

  assert.equal(first.postId, 'fresh')
  assert.ok(first.signal.score - second.signal.score <= 12)
})

test('uses stable tie-breakers for repeatable results', () => {
  const first = makeItem('100', { createdAt: now })
  const second = makeItem('200', { createdAt: now })

  const one = rankXInbox({ items: [first, second], now }).map(
    (item) => item.postId,
  )
  const two = rankXInbox({ items: [second, first], now }).map(
    (item) => item.postId,
  )

  assert.deepEqual(one, two)
})
