import assert from 'node:assert/strict'
import test from 'node:test'
import { buildXAuthorizeUrl, pkceChallengeS256 } from './client.js'

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
