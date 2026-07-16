import assert from 'node:assert/strict'
import test from 'node:test'
import { ILO_VERSION } from '../../version.js'
import {
  fetchFxTwitterArticles,
  fetchFxTwitterFollowers,
  fetchFxTwitterFollowing,
  fetchFxTwitterProfile,
  fetchFxTwitterSearch,
  fetchFxTwitterStatus,
} from './fxtwitter.js'

test('reads FxTwitter profiles and follower cursors', async () => {
  const requests: string[] = []
  const requestHeaders: Array<RequestInit['headers']> = []
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input)
    requests.push(url)
    requestHeaders.push(init?.headers ?? {})
    if (url.includes('/followers')) {
      return Response.json({
        code: 200,
        results: [
          {
            id: '2',
            name: 'Follower',
            screen_name: 'follower',
            description: 'Engineer @example',
          },
        ],
        cursor: { bottom: 'next-page' },
      })
    }
    return Response.json({
      code: 200,
      user: {
        id: '1',
        name: 'Subject',
        screen_name: 'subject',
        followers: 1,
      },
    })
  }

  const subject = await fetchFxTwitterProfile('subject', { fetch: fetcher })
  const followers = await fetchFxTwitterFollowers(
    'subject',
    { count: 70, cursor: 'previous-page' },
    { fetch: fetcher },
  )

  assert.equal(subject.id, '1')
  assert.equal(followers.profiles[0]?.screen_name, 'follower')
  assert.equal(followers.nextCursor, 'next-page')
  assert.match(requests[1] ?? '', /count=70/)
  assert.match(requests[1] ?? '', /cursor=previous-page/)
  assert.equal(
    new Headers(requestHeaders[0]).get('user-agent'),
    `ilo/${ILO_VERSION} (+https://ilo.so)`,
  )
})

test('reads following pages and latest search results', async () => {
  const requests: string[] = []
  const fetcher: typeof fetch = async (input) => {
    const url = String(input)
    requests.push(url)
    if (url.includes('/following')) {
      return Response.json({
        code: 200,
        results: [{ id: '2', name: 'Followed', screen_name: 'followed' }],
        cursor: { bottom: 'following-next' },
      })
    }
    return Response.json({
      code: 200,
      results: [
        {
          type: 'status',
          id: '123',
          url: 'https://x.com/author/status/123',
          text: 'Has anyone tried ilo?',
          created_at: 'Wed Jul 16 07:00:00 +0000 2026',
          created_timestamp: 1_784_185_200,
          likes: 3,
          reposts: 1,
          quotes: 0,
          replies: 2,
          author: { id: '3', name: 'Author', screen_name: 'author' },
        },
      ],
      cursor: { bottom: 'search-next' },
    })
  }

  const following = await fetchFxTwitterFollowing(
    'subject',
    { cursor: 'following-before' },
    { fetch: fetcher },
  )
  const search = await fetchFxTwitterSearch(
    { query: '@ilo OR "ilo.so"', count: 30 },
    { fetch: fetcher },
  )

  assert.equal(following.profiles[0]?.screen_name, 'followed')
  assert.equal(following.nextCursor, 'following-next')
  assert.equal(search.posts[0]?.id, '123')
  assert.equal(search.nextCursor, 'search-next')
  assert.match(requests[0] ?? '', /\/following\?count=100/)
  assert.match(requests[0] ?? '', /cursor=following-before/)
  assert.match(requests[1] ?? '', /feed=latest/)
  assert.match(requests[1] ?? '', /q=%40ilo\+OR\+%22ilo.so%22/)
})

test('treats empty FxTwitter search responses as an empty page', async () => {
  const fetcher: typeof fetch = async () =>
    Response.json({ code: 404, results: [], cursor: null }, { status: 404 })

  const result = await fetchFxTwitterSearch(
    { query: 'nothing here' },
    { fetch: fetcher, maxRetries: 0 },
  )

  assert.deepEqual(result, { posts: [], nextCursor: null })
})

test('reads article timelines and hydrates a full article status', async () => {
  const requests: string[] = []
  const article = {
    id: 'article-123',
    title: 'Building useful agents',
    preview_text: 'A practical write-up.',
    content: {
      blocks: [
        {
          key: 'intro',
          type: 'unstyled',
          text: 'The complete article body.',
        },
      ],
      entityMap: [],
    },
  }
  const post = {
    type: 'status' as const,
    id: '123',
    url: 'https://x.com/author/status/123',
    text: '',
    created_at: 'Wed Jul 16 07:00:00 +0000 2026',
    likes: 3,
    reposts: 1,
    quotes: 0,
    replies: 2,
    author: { id: '3', name: 'Author', screen_name: 'author' },
    article,
  }
  const fetcher: typeof fetch = async (input) => {
    const url = String(input)
    requests.push(url)
    return url.includes('/articles')
      ? Response.json({
          code: 200,
          results: [{ ...post, article: { ...article, content: undefined } }],
          cursor: { bottom: 'article-next' },
        })
      : Response.json({ code: 200, status: post })
  }

  const page = await fetchFxTwitterArticles(
    'author',
    { count: 25, cursor: 'previous', language: 'en' },
    { fetch: fetcher },
  )
  const hydrated = await fetchFxTwitterStatus('123', { fetch: fetcher })

  assert.equal(page.posts[0]?.article?.title, 'Building useful agents')
  assert.equal(page.nextCursor, 'article-next')
  assert.equal(
    hydrated.article?.content?.blocks?.[0]?.text,
    'The complete article body.',
  )
  assert.match(requests[0] ?? '', /\/profile\/author\/articles\?count=25/)
  assert.match(requests[0] ?? '', /cursor=previous/)
  assert.match(requests[0] ?? '', /lang=en/)
  assert.match(requests[1] ?? '', /\/2\/status\/123$/)
})
