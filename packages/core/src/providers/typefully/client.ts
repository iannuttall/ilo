import { basename } from 'node:path'
import { normalizeXPostId } from '../x/client.js'
import {
  normalizeXPostImages,
  readXImageFile,
  type XPostImage,
} from '../x/media.js'

const TYPEFULLY_API_BASE = 'https://api.typefully.com'

export type TypefullyMe = {
  id: number
  name: string
  email: string
  api_key_label?: string | null
}

type TypefullySocialSetListItem = {
  id: number
  username: string
  name: string
}

export type TypefullySocialSet = TypefullySocialSetListItem & {
  platforms: {
    x?: {
      platform: 'x'
      username: string
      name: string
      profile_url?: string | null
    } | null
  }
}

export type TypefullyXAccount = {
  socialSetId: number
  username: string
  displayName: string
}

type TypefullyDraft = {
  id: number
  status: string
  publish_state?: string | null
  x_published_url?: string | null
}

type TypefullyMediaStatus = {
  media_id: string
  status: 'processing' | 'ready' | 'failed'
  error_reason?: string | null
}

export type TypefullyClientOptions = {
  fetcher?: typeof fetch
  wait?: (milliseconds: number) => Promise<void>
  pollIntervalMs?: number
  maxPollAttempts?: number
}

const responseError = async (response: Response) => {
  const payload = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string }
    detail?: string
  } | null
  const code = payload?.error?.code?.toLowerCase()
  const detail = payload?.error?.message ?? payload?.detail
  const suffix = [code, detail].filter(Boolean).join(':')
  return suffix
    ? `typefully_api_error_${response.status}:${suffix}`
    : `typefully_api_error_${response.status}`
}

const typefullyFetch = async <T>(
  apiKey: string,
  path: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
): Promise<T> => {
  const headers = new Headers(init.headers)
  headers.set('authorization', `Bearer ${apiKey}`)
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  const url = path.startsWith('http') ? path : `${TYPEFULLY_API_BASE}${path}`
  const response = await fetcher(url, { ...init, headers })
  if (!response.ok) throw new Error(await responseError(response))
  return response.json() as Promise<T>
}

export const fetchTypefullyMe = (
  apiKey: string,
  fetcher: typeof fetch = fetch,
) => typefullyFetch<TypefullyMe>(apiKey, '/v2/me', {}, fetcher)

export const fetchTypefullySocialSets = async (
  apiKey: string,
  fetcher: typeof fetch = fetch,
) => {
  const socialSets: TypefullySocialSetListItem[] = []
  let offset = 0
  while (true) {
    const page = await typefullyFetch<{
      results: TypefullySocialSetListItem[]
      count: number
      next: string | null
    }>(apiKey, `/v2/social-sets?limit=50&offset=${offset}`, {}, fetcher)
    socialSets.push(...page.results)
    if (!page.next || socialSets.length >= page.count) return socialSets
    offset += page.results.length
    if (page.results.length === 0) return socialSets
  }
}

export const fetchTypefullySocialSet = (
  apiKey: string,
  socialSetId: number,
  fetcher: typeof fetch = fetch,
) =>
  typefullyFetch<TypefullySocialSet>(
    apiKey,
    `/v2/social-sets/${socialSetId}/`,
    {},
    fetcher,
  )

export const discoverTypefullyXAccounts = async (
  apiKey: string,
  fetcher: typeof fetch = fetch,
) => {
  const [me, listed] = await Promise.all([
    fetchTypefullyMe(apiKey, fetcher),
    fetchTypefullySocialSets(apiKey, fetcher),
  ])
  const detailed = await Promise.all(
    listed.map((socialSet) =>
      fetchTypefullySocialSet(apiKey, socialSet.id, fetcher),
    ),
  )
  const accounts: TypefullyXAccount[] = detailed.flatMap((socialSet) => {
    const x = socialSet.platforms.x
    if (!x?.username) return []
    return [
      {
        socialSetId: socialSet.id,
        username: x.username.replace(/^@/, ''),
        displayName: x.name || socialSet.name || x.username,
      },
    ]
  })
  return { me, accounts }
}

const waitFor = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds))

const typefullyImageFileName = (
  path: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
) => {
  const extension = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  }[mediaType]
  const sanitized = basename(path)
    .replace(/\.[^.]*$/, '')
    .replace(/[^a-zA-Z0-9_.()-]/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
  const stem = sanitized || 'image'
  return `${stem.slice(0, 255 - extension.length)}${extension}`
}

const poll = async <T>(
  read: () => Promise<T>,
  complete: (value: T) => boolean,
  options: TypefullyClientOptions,
  timeoutError: string,
) => {
  const wait = options.wait ?? waitFor
  const attempts = options.maxPollAttempts ?? 60
  const interval = options.pollIntervalMs ?? 1_000
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = await read()
    if (complete(value)) return value
    if (attempt + 1 < attempts) await wait(interval)
  }
  throw new Error(timeoutError)
}

const uploadTypefullyImage = async (
  apiKey: string,
  socialSetId: number,
  image: XPostImage,
  options: TypefullyClientOptions,
) => {
  if (image.altText?.trim()) {
    throw new Error('typefully_image_alt_text_unsupported')
  }
  const fetcher = options.fetcher ?? fetch
  const file = await readXImageFile(image)
  const fileName = typefullyImageFileName(file.path, file.mediaType)
  const upload = await typefullyFetch<{
    media_id: string
    upload_url: string
  }>(
    apiKey,
    `/v2/social-sets/${socialSetId}/media/upload`,
    {
      method: 'POST',
      body: JSON.stringify({ file_name: fileName }),
    },
    fetcher,
  )
  const response = await fetcher(upload.upload_url, {
    method: 'PUT',
    body: new Uint8Array(file.content),
  })
  if (!response.ok) throw new Error('typefully_media_upload_failed')
  const status = await poll(
    () =>
      typefullyFetch<TypefullyMediaStatus>(
        apiKey,
        `/v2/social-sets/${socialSetId}/media/${upload.media_id}`,
        {},
        fetcher,
      ),
    (value) => value.status !== 'processing',
    options,
    'typefully_media_processing_timeout',
  )
  if (status.status !== 'ready') {
    throw new Error(
      status.error_reason
        ? `typefully_media_processing_failed:${status.error_reason}`
        : 'typefully_media_processing_failed',
    )
  }
  return {
    id: upload.media_id,
    path: file.path,
    altText: null,
    mediaType: file.mediaType,
    size: file.size,
  }
}

export const publishTypefullyXPost = async (
  apiKey: string,
  socialSetId: number,
  text: string,
  input: { replyToPostId?: string; images?: XPostImage[] } = {},
  options: TypefullyClientOptions = {},
) => {
  const fetcher = options.fetcher ?? fetch
  const images = normalizeXPostImages(input.images)
  if (images.some((image) => image.altText)) {
    throw new Error('typefully_image_alt_text_unsupported')
  }
  const media = []
  for (const image of images) {
    media.push(await uploadTypefullyImage(apiKey, socialSetId, image, options))
  }
  const replyToPostId = input.replyToPostId
    ? normalizeXPostId(input.replyToPostId)
    : undefined
  const xPlatform: Record<string, unknown> = {
    enabled: true,
    posts: [
      {
        text,
        ...(media.length ? { media_ids: media.map((item) => item.id) } : {}),
      },
    ],
  }
  if (replyToPostId) {
    xPlatform.settings = {
      reply_to_url: `https://x.com/i/web/status/${replyToPostId}`,
    }
  }
  const draft = await typefullyFetch<TypefullyDraft>(
    apiKey,
    `/v2/social-sets/${socialSetId}/drafts`,
    {
      method: 'POST',
      body: JSON.stringify({
        platforms: { x: xPlatform },
        publish_at: 'now',
      }),
    },
    fetcher,
  )
  const finished = draft.x_published_url
    ? draft
    : await poll(
        () =>
          typefullyFetch<TypefullyDraft>(
            apiKey,
            `/v2/social-sets/${socialSetId}/drafts/${draft.id}`,
            {},
            fetcher,
          ),
        (value) =>
          value.publish_state === 'finished' || Boolean(value.x_published_url),
        options,
        'typefully_publish_timeout',
      )
  if (!finished.x_published_url) {
    throw new Error(`typefully_publish_failed:${finished.status}`)
  }
  return {
    providerDraftId: String(finished.id),
    providerPostId: normalizeXPostId(finished.x_published_url),
    providerUrl: finished.x_published_url,
    text,
    replyToPostId: replyToPostId ?? null,
    media,
  }
}
