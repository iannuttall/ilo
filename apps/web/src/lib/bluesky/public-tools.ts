type BskyProfile = {
  did: string
  handle: string
  displayName?: string
  avatar?: string
  description?: string
}

const normalizeHandle = (value: string) => {
  const cleaned = value.trim().replace(/^@+/, '')
  if (!cleaned) throw new Error('Handle is required')
  return cleaned.includes('.') || cleaned.startsWith('did:')
    ? cleaned
    : `${cleaned}.bsky.social`
}

export const getBlueskyProfile = async (value: string) => {
  const actor = normalizeHandle(value)
  const url = new URL(
    'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile',
  )
  url.searchParams.set('actor', actor)
  const response = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
  })
  const payload = (await response
    .json()
    .catch(() => null)) as BskyProfile | null
  if (!response.ok || !payload?.did)
    throw new Error('Bluesky profile not found')
  return {
    did: payload.did,
    handle: payload.handle,
    display_name: payload.displayName ?? payload.handle,
    avatar_url: payload.avatar ?? null,
    description: payload.description ?? '',
  }
}

export const getBlueskySignupNumber = async (input: {
  username: string
  password: string
}) => {
  const identifier = normalizeHandle(input.username)
  const password = input.password.trim()
  if (!password) throw new Error('Password is required')
  const sessionResponse = await fetch(
    'https://bsky.social/xrpc/com.atproto.server.createSession',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    },
  )
  const session = (await sessionResponse.json().catch(() => null)) as {
    accessJwt?: string
    message?: string
  } | null
  if (!sessionResponse.ok || !session?.accessJwt) {
    throw new Error(session?.message ?? 'Unable to create Bluesky session')
  }
  const numberResponse = await fetch(
    'https://bsky.social/xrpc/com.atproto.temp.getSignupNumber',
    { headers: { authorization: `Bearer ${session.accessJwt}` } },
  )
  const payload = (await numberResponse.json().catch(() => null)) as {
    number?: number
    message?: string
    error?: string
  } | null
  if (!numberResponse.ok || !payload?.number) {
    throw new Error(
      payload?.message ??
        payload?.error ??
        'Bluesky no longer provides numerical IDs for some accounts',
    )
  }
  return payload.number
}
