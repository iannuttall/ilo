import assert from 'node:assert/strict'
import test from 'node:test'
import { ILO_VERSION } from '../../version.js'
import { fetchFxTwitterFollowers, fetchFxTwitterProfile } from './fxtwitter.js'

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
