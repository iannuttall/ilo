import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { normalizeXPostImages, uploadXImage } from './media.js'

test('normalizes image paths and checks alt text length', () => {
  const [image] = normalizeXPostImages([
    { path: './photo.png', altText: '  A small chart  ' },
  ])
  assert.equal(image?.path.endsWith('/photo.png'), true)
  assert.equal(image?.altText, 'A small chart')
  assert.throws(
    () => normalizeXPostImages([{ path: 'x.png', altText: 'x'.repeat(1_001) }]),
    /x_image_alt_text_too_long/,
  )
})

test('uploads a static image and attaches alt text metadata', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-image-'))
  const path = join(directory, 'tiny.png')
  writeFileSync(
    path,
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  )
  const requests: Array<{ url: string; init?: RequestInit }> = []
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input)
    requests.push({ url, init })
    if (url.endsWith('/media/upload')) {
      assert.equal(init?.body instanceof FormData, true)
      return Response.json({ data: { id: '123', size: 9 } })
    }
    return Response.json({ data: { id: '123' } })
  }

  try {
    const uploaded = await uploadXImage(
      'token',
      { path, altText: 'A one-pixel test image' },
      fetcher,
    )
    assert.equal(uploaded.id, '123')
    assert.equal(uploaded.mediaType, 'image/png')
    assert.equal(requests.length, 2)
    assert.match(String(requests[1]?.init?.body), /alt_text/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
