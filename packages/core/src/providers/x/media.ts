import { readFile, stat } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

const X_API_BASE = 'https://api.x.com/2'
export const X_MAX_POST_IMAGES = 4
export const X_MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const X_MAX_ALT_TEXT_LENGTH = 1_000

export type XPostImage = {
  path: string
  altText?: string
}

export type XUploadedImage = {
  id: string
  path: string
  altText: string | null
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
  size: number
}

export type XImageFile = {
  path: string
  altText: string | null
  mediaType: XUploadedImage['mediaType']
  size: number
  content: Buffer
}

const apiError = async (response: Response) => {
  const payload = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null
  const detail =
    payload?.detail ??
    payload?.error_description ??
    payload?.title ??
    payload?.error ??
    payload?.message
  return detail
    ? `x_api_error_${response.status}:${String(detail)}`
    : `x_api_error_${response.status}`
}

export const detectXImageType = (
  content: Buffer,
): XUploadedImage['mediaType'] | null => {
  if (
    content.length >= 8 &&
    content
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png'
  }
  if (
    content.length >= 3 &&
    content[0] === 0xff &&
    content[1] === 0xd8 &&
    content[2] === 0xff
  ) {
    return 'image/jpeg'
  }
  if (
    content.length >= 12 &&
    content.subarray(0, 4).toString('ascii') === 'RIFF' &&
    content.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

export const readXImageFile = async (
  image: XPostImage,
): Promise<XImageFile> => {
  const normalized = normalizeXPostImages([image])[0]
  if (!normalized) throw new Error('x_image_path_required')
  const info = await stat(normalized.path).catch((error) => {
    const code = (error as NodeJS.ErrnoException).code
    throw new Error(
      code === 'ENOENT' ? 'x_image_not_found' : 'x_image_unreadable',
    )
  })
  if (!info.isFile()) throw new Error('x_image_not_file')
  if (info.size < 1) throw new Error('x_image_empty')
  if (info.size > X_MAX_IMAGE_BYTES) throw new Error('x_image_too_large')
  const content = await readFile(normalized.path)
  const mediaType = detectXImageType(content)
  if (!mediaType) throw new Error('x_image_type_unsupported')
  return {
    path: normalized.path,
    altText: normalized.altText ?? null,
    mediaType,
    size: info.size,
    content,
  }
}

export const normalizeXPostImages = (images: XPostImage[] = []) => {
  if (images.length > X_MAX_POST_IMAGES) throw new Error('x_too_many_images')
  return images.map((image) => {
    const path = image.path.trim()
    if (!path) throw new Error('x_image_path_required')
    const altText = image.altText?.trim()
    if (altText && altText.length > X_MAX_ALT_TEXT_LENGTH) {
      throw new Error('x_image_alt_text_too_long')
    }
    return { path: resolve(path), altText: altText || undefined }
  })
}

const uploadImageMetadata = async (
  accessToken: string,
  id: string,
  altText: string,
  fetcher: typeof fetch,
) => {
  const response = await fetcher(`${X_API_BASE}/media/metadata`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      id,
      metadata: { alt_text: { text: altText } },
    }),
  })
  if (!response.ok) throw new Error(await apiError(response))
}

export const uploadXImage = async (
  accessToken: string,
  image: XPostImage,
  fetcher: typeof fetch = fetch,
): Promise<XUploadedImage> => {
  const file = await readXImageFile(image)

  const form = new FormData()
  form.append(
    'media',
    new Blob([file.content], { type: file.mediaType }),
    basename(file.path),
  )
  form.append('media_category', 'tweet_image')
  form.append('media_type', file.mediaType)
  form.append('shared', 'false')
  const response = await fetcher(`${X_API_BASE}/media/upload`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
    body: form,
  })
  if (!response.ok) throw new Error(await apiError(response))
  const payload = (await response.json()) as {
    data?: { id?: string; size?: number }
  }
  const id = payload.data?.id
  if (!id || !/^\d{1,19}$/.test(id))
    throw new Error('x_media_upload_missing_id')
  if (file.altText) {
    await uploadImageMetadata(accessToken, id, file.altText, fetcher)
  }
  return {
    id,
    path: file.path,
    altText: file.altText,
    mediaType: file.mediaType,
    size: payload.data?.size ?? file.size,
  }
}

export const uploadXImages = async (
  accessToken: string,
  images: XPostImage[] = [],
  fetcher: typeof fetch = fetch,
) => {
  const normalized = normalizeXPostImages(images)
  const uploaded: XUploadedImage[] = []
  for (const image of normalized) {
    uploaded.push(await uploadXImage(accessToken, image, fetcher))
  }
  return uploaded
}
