export type FitMode = 'cover' | 'contain'

export type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp'

export type RenderOptions = {
  targetWidth: number
  targetHeight: number
  fit: FitMode
  offsetX?: number
  offsetY?: number
  scale?: number
  background?: string
  format?: ExportFormat
  quality?: number
}

export type RenderResult = {
  blob: Blob
  url: string
  width: number
  height: number
}

export const loadImageFromFile = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.onload = () => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () =>
        reject(new Error('That file does not look like an image.'))
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })

export const computeCoverRect = (
  source: { width: number; height: number },
  target: { width: number; height: number },
) => {
  const sourceRatio = source.width / source.height
  const targetRatio = target.width / target.height
  if (sourceRatio >= targetRatio) {
    const drawHeight = target.height
    const drawWidth = drawHeight * sourceRatio
    return {
      width: drawWidth,
      height: drawHeight,
      x: (target.width - drawWidth) / 2,
      y: 0,
    }
  }
  const drawWidth = target.width
  const drawHeight = drawWidth / sourceRatio
  return {
    width: drawWidth,
    height: drawHeight,
    x: 0,
    y: (target.height - drawHeight) / 2,
  }
}

export const computeContainRect = (
  source: { width: number; height: number },
  target: { width: number; height: number },
) => {
  const sourceRatio = source.width / source.height
  const targetRatio = target.width / target.height
  if (sourceRatio >= targetRatio) {
    const drawWidth = target.width
    const drawHeight = drawWidth / sourceRatio
    return {
      width: drawWidth,
      height: drawHeight,
      x: 0,
      y: (target.height - drawHeight) / 2,
    }
  }
  const drawHeight = target.height
  const drawWidth = drawHeight * sourceRatio
  return {
    width: drawWidth,
    height: drawHeight,
    x: (target.width - drawWidth) / 2,
    y: 0,
  }
}

export const renderImageToBlob = async (
  image: HTMLImageElement,
  options: RenderOptions,
): Promise<RenderResult> => {
  const {
    targetWidth,
    targetHeight,
    fit,
    offsetX = 0,
    offsetY = 0,
    scale = 1,
    background = '#ffffff',
    format = 'image/png',
    quality = 0.95,
  } = options

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported on this browser.')

  if (format !== 'image/png') {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, targetWidth, targetHeight)
  } else if (fit === 'contain') {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, targetWidth, targetHeight)
  }

  const natural = { width: image.naturalWidth, height: image.naturalHeight }
  const base =
    fit === 'cover'
      ? computeCoverRect(natural, { width: targetWidth, height: targetHeight })
      : computeContainRect(natural, {
          width: targetWidth,
          height: targetHeight,
        })

  const drawWidth = base.width * scale
  const drawHeight = base.height * scale
  const centerX = targetWidth / 2
  const centerY = targetHeight / 2
  const drawX = centerX - drawWidth / 2 + offsetX
  const drawY = centerY - drawHeight / 2 + offsetY

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), format, quality)
  })
  if (!blob) throw new Error('Could not export the resized image.')
  const url = URL.createObjectURL(blob)
  return { blob, url, width: targetWidth, height: targetHeight }
}

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const buildFilename = (
  baseLabel: string,
  width: number,
  height: number,
  format: ExportFormat,
) => {
  const slug = baseLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const ext =
    format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png'
  return `${slug || 'image'}-${width}x${height}.${ext}`
}
