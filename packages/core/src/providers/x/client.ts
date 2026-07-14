import { createHash, randomBytes } from 'node:crypto'

const AUTHORIZE_URL = 'https://x.com/i/oauth2/authorize'
const TOKEN_URL = 'https://api.x.com/2/oauth2/token'
const API_BASE = 'https://api.x.com/2'
export const X_USER_OAUTH_SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'offline.access',
]

export type XClientConfig = { clientId: string; clientSecret?: string }
export type XTokens = {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scopes: string
}

const base64Url = (value: Buffer) => value.toString('base64url')
export const generatePkceVerifier = () => base64Url(randomBytes(32))
export const generateOAuthState = () => randomBytes(24).toString('hex')
export const pkceChallengeS256 = (verifier: string) =>
  base64Url(createHash('sha256').update(verifier).digest())

export const buildXAuthorizeUrl = (input: {
  clientId: string
  redirectUri: string
  state: string
  codeVerifier: string
  scopes?: string[]
}) => {
  const url = new URL(AUTHORIZE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', input.clientId)
  url.searchParams.set('redirect_uri', input.redirectUri)
  url.searchParams.set('scope', (input.scopes ?? X_USER_OAUTH_SCOPES).join(' '))
  url.searchParams.set('state', input.state)
  url.searchParams.set('code_challenge', pkceChallengeS256(input.codeVerifier))
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

const errorMessage = async (response: Response) => {
  const payload = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null
  const detail =
    payload?.detail ??
    payload?.error_description ??
    payload?.title ??
    payload?.error
  return detail
    ? `x_api_error_${response.status}:${String(detail)}`
    : `x_api_error_${response.status}`
}

const tokenRequest = async (
  config: XClientConfig,
  body: URLSearchParams,
): Promise<XTokens> => {
  const headers = new Headers({
    'content-type': 'application/x-www-form-urlencoded',
  })
  if (config.clientSecret) {
    headers.set(
      'authorization',
      `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
    )
  }
  const response = await fetch(TOKEN_URL, { method: 'POST', headers, body })
  if (!response.ok) throw new Error(await errorMessage(response))
  const token = (await response.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    scope?: string
  }
  if (!token.access_token) throw new Error('x_token_missing')
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + (token.expires_in ?? 0) * 1000,
    scopes: token.scope ?? '',
  }
}

export const exchangeXCode = (
  input: XClientConfig & {
    code: string
    redirectUri: string
    codeVerifier: string
  },
) => {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    code_verifier: input.codeVerifier,
  })
  return tokenRequest(input, body)
}

export const refreshXToken = (
  input: XClientConfig & { refreshToken: string },
) => {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: input.refreshToken,
    client_id: input.clientId,
  })
  return tokenRequest(input, body)
}

const xFetch = async <T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const headers = new Headers(init?.headers)
  headers.set('authorization', `Bearer ${accessToken}`)
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (!response.ok) throw new Error(await errorMessage(response))
  return response.json() as Promise<T>
}

export const fetchXMe = async (accessToken: string) => {
  const result = await xFetch<{
    data?: { id: string; name?: string; username?: string }
  }>(accessToken, '/users/me')
  if (!result.data?.id) throw new Error('x_account_missing')
  return result.data
}

export const createXPost = async (accessToken: string, text: string) => {
  const result = await xFetch<{ data?: { id: string; text?: string } }>(
    accessToken,
    '/tweets',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    },
  )
  if (!result.data?.id) throw new Error('x_publish_missing_post_id')
  return {
    providerPostId: result.data.id,
    providerUrl: `https://x.com/i/web/status/${result.data.id}`,
    text: result.data.text ?? text,
  }
}
