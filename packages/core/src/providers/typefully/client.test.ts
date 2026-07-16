import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { discoverTypefullyXAccounts, publishTypefullyXPost } from './client.js'

test('discovers every X account available through Typefully social sets', async () => {
  const fetcher: typeof fetch = async (input) => {
    const url = String(input)
    if (url.endsWith('/v2/me')) {
      return Response.json({ id: 7, name: 'Ian', email: 'ian@example.com' })
    }
    if (url.includes('/v2/social-sets?')) {
      return Response.json({
        results: [
          { id: 10, username: 'personal', name: 'Personal' },
          { id: 20, username: 'company', name: 'Company' },
          { id: 30, username: 'linkedin', name: 'LinkedIn only' },
        ],
        count: 3,
        next: null,
      })
    }
    const socialSetId = Number(url.match(/social-sets\/(\d+)/)?.[1])
    if (socialSetId === 30) {
      return Response.json({
        id: 30,
        username: 'linkedin',
        name: 'LinkedIn only',
        platforms: { linkedin: { username: 'linkedin' } },
      })
    }
    return Response.json({
      id: socialSetId,
      username: socialSetId === 10 ? 'personal' : 'company',
      name: socialSetId === 10 ? 'Personal' : 'Company',
      platforms: {
        x: {
          platform: 'x',
          username: socialSetId === 10 ? 'personal' : 'company',
          name: socialSetId === 10 ? 'Personal' : 'Company',
        },
      },
    })
  }

  const result = await discoverTypefullyXAccounts('secret', fetcher)
  assert.equal(result.me.id, 7)
  assert.deepEqual(
    result.accounts.map((account) => account.username),
    ['personal', 'company'],
  )
})

test('publishes a direct X reply through the selected Typefully social set', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = []
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input)
    requests.push({ url, init })
    if (init?.method === 'POST') {
      return Response.json({
        id: 99,
        status: 'draft',
        publish_state: 'in_progress',
      })
    }
    return Response.json({
      id: 99,
      status: 'published',
      publish_state: 'finished',
      x_published_url: 'https://x.com/company/status/456',
    })
  }

  const result = await publishTypefullyXPost(
    'secret',
    20,
    'A useful reply',
    { replyToPostId: 'https://x.com/adam/status/123' },
    {
      fetcher,
      wait: async () => undefined,
      maxPollAttempts: 2,
    },
  )
  const create = requests.find((request) => request.init?.method === 'POST')
  const body = JSON.parse(String(create?.init?.body))
  assert.equal(create?.url.endsWith('/v2/social-sets/20/drafts'), true)
  assert.equal(body.publish_at, 'now')
  assert.equal(
    body.platforms.x.settings.reply_to_url,
    'https://x.com/i/web/status/123',
  )
  assert.equal(result.providerPostId, '456')
  assert.equal(result.replyToPostId, '123')
})

test('uploads an image and rejects undocumented Typefully alt text', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-typefully-media-'))
  const imagePath = join(directory, 'tiny chart.data')
  writeFileSync(
    imagePath,
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  )
  const requests: Array<{ url: string; init?: RequestInit }> = []
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input)
    requests.push({ url, init })
    if (url.endsWith('/media/upload')) {
      return Response.json({
        media_id: '550e8400-e29b-41d4-a716-446655440000',
        upload_url: 'https://uploads.example.com/file',
      })
    }
    if (url === 'https://uploads.example.com/file') return new Response(null)
    if (url.includes('/media/')) {
      return Response.json({
        media_id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'ready',
      })
    }
    return Response.json({
      id: 100,
      status: 'published',
      publish_state: 'finished',
      x_published_url: 'https://x.com/company/status/789',
    })
  }

  try {
    const published = await publishTypefullyXPost(
      'secret',
      20,
      'With an image',
      { images: [{ path: imagePath }] },
      { fetcher, wait: async () => undefined },
    )
    assert.equal(published.media.length, 1)
    const uploadRequest = requests.find((request) =>
      request.url.endsWith('/media/upload'),
    )
    assert.equal(
      JSON.parse(String(uploadRequest?.init?.body)).file_name,
      'tiny-chart.png',
    )
    assert.equal(
      requests.some(
        (request) =>
          request.url === 'https://uploads.example.com/file' &&
          request.init?.method === 'PUT',
      ),
      true,
    )
    await assert.rejects(
      publishTypefullyXPost(
        'secret',
        20,
        'Alt text',
        { images: [{ path: imagePath, altText: 'A chart' }] },
        { fetcher },
      ),
      /typefully_image_alt_text_unsupported/,
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
