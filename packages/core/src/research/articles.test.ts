import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import type {
  FxTwitterStatus,
  FxTwitterUser,
} from '../providers/x/fxtwitter.js'
import {
  createXArticleMonitor,
  deleteXArticleMonitor,
  getXArticle,
  listXArticleMonitors,
  refreshXArticleMonitor,
  refreshXArticles,
  searchXArticles,
  setXArticleMonitorEnabled,
} from './articles.js'

const author = (handle: string): FxTwitterUser => ({
  id: `${handle}-id`,
  name: handle === 'swyx' ? 'Shawn Wang' : handle,
  screen_name: handle,
  description: 'Writes detailed technical articles',
  followers: 12_000,
  verification: { verified: true, type: 'individual' },
})

const articlePost = (
  id: string,
  handle: string,
  title: string,
  body: string,
): FxTwitterStatus => ({
  type: 'status',
  id,
  url: `https://x.com/${handle}/status/${id}`,
  text: '',
  created_at: 'Wed Jul 16 07:00:00 +0000 2026',
  likes: 3,
  reposts: 1,
  quotes: 0,
  replies: 2,
  author: author(handle),
  article: {
    id: `article-${id}`,
    title,
    preview_text: `${title} preview`,
    created_at: '2026-07-16T07:00:00.000Z',
    modified_at: '2026-07-16T08:00:00.000Z',
    cover_media: {
      media_info: { original_img_url: `https://images.test/${id}.jpg` },
    },
    content: {
      blocks: [
        { key: `${id}-a`, type: 'header-two', text: title },
        { key: `${id}-b`, type: 'unstyled', text: body },
      ],
      entityMap: [],
    },
  },
})

const summary = (post: FxTwitterStatus): FxTwitterStatus => ({
  ...post,
  article: post.article
    ? { ...post.article, content: { blocks: [], entityMap: [] } }
    : null,
})

test('resumes article history and searches hydrated article text', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-articles-'))
  const databasePath = join(directory, 'ilo.sqlite')
  const newest = articlePost(
    '200',
    'swyx',
    'Practical agents',
    'A production agent needs useful tools and clear evidence.',
  )
  const older = articlePost(
    '199',
    'swyx',
    'Writing software',
    'Notes about maintaining software over time.',
  )
  const later = articlePost(
    '201',
    'swyx',
    'Browser automation',
    'Building browser tools with agents and deterministic tests.',
  )
  let includeLater = false
  const cursors: Array<string | null> = []
  const hydrated: string[] = []
  const client = {
    articles: async (
      _handle: string,
      input: { count: number; cursor: string | null },
    ) => {
      cursors.push(input.cursor)
      if (input.cursor === 'older-page') {
        return { posts: [summary(older)], nextCursor: null }
      }
      return includeLater
        ? { posts: [summary(later), summary(newest)], nextCursor: 'older-page' }
        : { posts: [summary(newest)], nextCursor: 'older-page' }
    },
    status: async (postId: string) => {
      hydrated.push(postId)
      const posts = { '199': older, '200': newest, '201': later }
      return posts[postId as keyof typeof posts]
    },
  }

  try {
    const monitor = createXArticleMonitor({
      accountHandle: 'owner',
      sourceHandle: '@swyx',
      databasePath,
    })

    const first = await refreshXArticleMonitor(
      { id: monitor.id, maxPages: 1, databasePath },
      client,
    )
    assert.equal(first.newArticles, 1)
    assert.equal(first.truncated, true)
    assert.equal(first.monitor.cursor, 'older-page')
    assert.equal(first.monitor.historyComplete, false)

    const second = await refreshXArticleMonitor(
      { id: monitor.id, maxPages: 1, databasePath },
      client,
    )
    assert.equal(second.newArticles, 1)
    assert.equal(second.truncated, false)
    assert.equal(second.monitor.historyComplete, true)
    assert.deepEqual(cursors, [null, 'older-page'])

    includeLater = true
    const third = await refreshXArticleMonitor(
      { id: monitor.id, databasePath },
      client,
    )
    assert.equal(third.newArticles, 1)
    assert.equal(third.truncated, false)
    assert.equal(third.monitor.newestPostId, '201')
    assert.deepEqual(hydrated, ['200', '199', '201', '200'])

    const all = searchXArticles({ accountHandle: 'owner', databasePath })
    assert.equal(all.length, 3)
    assert.equal(all[0]?.title, 'Browser automation')
    assert.equal(all[0]?.coverImageUrl, 'https://images.test/201.jpg')
    assert.equal(all[0]?.monitors[0]?.sourceHandle, 'swyx')
    assert.ok((all[0]?.bodyCharacters ?? 0) > 70)

    const search = searchXArticles({
      accountHandle: 'owner',
      query: 'browser tools',
      databasePath,
    })
    assert.deepEqual(
      search.map((article) => article.postId),
      ['201'],
    )
    assert.match(search[0]?.excerpt ?? '', /deterministic tests/)
    assert.equal(
      getXArticle({
        accountHandle: 'owner',
        identifier: 'article-201',
        databasePath,
      }).providerData?.article?.content?.blocks?.[1]?.text,
      'Building browser tools with agents and deterministic tests.',
    )

    const disabled = setXArticleMonitorEnabled({
      id: monitor.id,
      enabled: false,
      databasePath,
    })
    assert.equal(disabled.enabled, false)
    await assert.rejects(
      refreshXArticleMonitor({ id: monitor.id, databasePath }, client),
      /x_article_monitor_disabled/,
    )
    assert.equal(
      listXArticleMonitors({
        accountHandle: 'owner',
        includeDisabled: true,
        databasePath,
      }).length,
      1,
    )

    deleteXArticleMonitor({ id: monitor.id, databasePath })
    assert.equal(
      searchXArticles({ accountHandle: 'owner', databasePath }).length,
      0,
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('refreshes active article monitors and retains individual errors', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-article-refresh-'))
  const databasePath = join(directory, 'ilo.sqlite')
  try {
    createXArticleMonitor({
      accountHandle: 'owner',
      sourceHandle: 'working',
      databasePath,
    })
    createXArticleMonitor({
      accountHandle: 'owner',
      sourceHandle: 'broken',
      databasePath,
    })
    const result = await refreshXArticles(
      { accountHandle: 'owner', databasePath },
      {
        articles: async (handle) => {
          if (handle === 'broken') throw new Error('upstream_broken')
          return { posts: [], nextCursor: null }
        },
        status: async () => {
          throw new Error('status_should_not_be_called')
        },
      },
    )

    assert.equal(result.checked, 2)
    assert.equal(result.results.length, 1)
    assert.equal(result.failed.length, 1)
    assert.equal(result.failed[0]?.monitor.sourceHandle, 'broken')
    assert.equal(result.failed[0]?.error, 'upstream_broken')
    assert.equal(
      listXArticleMonitors({
        accountHandle: 'owner',
        includeDisabled: true,
        databasePath,
      }).find((monitor) => monitor.sourceHandle === 'broken')?.lastError,
      'upstream_broken',
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
