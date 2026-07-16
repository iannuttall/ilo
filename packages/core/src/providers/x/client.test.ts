import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test, { mock } from 'node:test'
import {
  buildXAuthorizeUrl,
  createXPost,
  normalizeXPostId,
  pkceChallengeS256,
} from './client.js'

test('builds an X OAuth 2.0 PKCE authorization URL', () => {
  const url = new URL(
    buildXAuthorizeUrl({
      clientId: 'client-id',
      redirectUri: 'http://127.0.0.1:8976/callback',
      state: 'state',
      codeVerifier: 'verifier',
    }),
  )

  assert.equal(url.origin, 'https://x.com')
  assert.equal(url.pathname, '/i/oauth2/authorize')
  assert.equal(url.searchParams.get('client_id'), 'client-id')
  assert.equal(
    url.searchParams.get('redirect_uri'),
    'http://127.0.0.1:8976/callback',
  )
  assert.equal(url.searchParams.get('state'), 'state')
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(
    url.searchParams.get('code_challenge'),
    pkceChallengeS256('verifier'),
  )
  assert.equal(
    url.searchParams.get('scope'),
    'tweet.read tweet.write users.read offline.access',
  )
})

test('normalizes numeric post ids and X URLs', () => {
  assert.equal(normalizeXPostId('123456'), '123456')
  assert.equal(
    normalizeXPostId('https://x.com/adam/status/2077414476345692347?s=20'),
    '2077414476345692347',
  )
  assert.throws(() => normalizeXPostId('not-a-post'), /invalid_x_post_id/)
  assert.throws(
    () => normalizeXPostId('https://example.com/status/123'),
    /invalid_x_post_id/,
  )
})

test('creates a reply with the requested target and uploaded image', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-x-post-'))
  const imagePath = join(directory, 'tiny.png')
  writeFileSync(
    imagePath,
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  )
  const requests: Array<{ url: string; init?: RequestInit }> = []
  mock.method(
    globalThis,
    'fetch',
    async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(input), init })
      if (String(input).endsWith('/media/upload')) {
        return Response.json({ data: { id: '789', size: 9 } })
      }
      return Response.json({ data: { id: '456', text: 'Reply body' } })
    },
  )
  try {
    const result = await createXPost('token', 'Reply body', {
      replyToPostId: 'https://x.com/adam/status/123',
      images: [{ path: imagePath }],
    })
    assert.equal(result.replyToPostId, '123')
    assert.equal(result.media[0]?.id, '789')
    assert.deepEqual(JSON.parse(String(requests[1]?.init?.body)), {
      text: 'Reply body',
      reply: { in_reply_to_tweet_id: '123' },
      media: { media_ids: ['789'] },
    })
  } finally {
    mock.restoreAll()
    rmSync(directory, { recursive: true, force: true })
  }
})
