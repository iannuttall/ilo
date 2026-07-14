export type TweetTheme = 'light' | 'dim' | 'dark'

export type TweetBackground =
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; from: string; to: string }
  | { kind: 'transparent' }

export type TweetAspect = 'auto' | 'square' | 'landscape' | 'portrait'

export type TweetRenderData = {
  author_name: string
  author_handle: string
  avatar_url: string | null
  verified: boolean
  text: string
  created_at: string | null
  image_url: string | null
  like_count: number | null
  retweet_count: number | null
  reply_count: number | null
  view_count: number | null
}

export type RenderOptions = {
  theme: TweetTheme
  background: TweetBackground
  aspect: TweetAspect
  showCounts: boolean
  width?: number
}

type ThemeTokens = {
  cardBg: string
  text: string
  muted: string
  border: string
  verifiedFill: string
}

const THEME_TOKENS: Record<TweetTheme, ThemeTokens> = {
  light: {
    cardBg: '#ffffff',
    text: '#0f1419',
    muted: '#536471',
    border: '#eff3f4',
    verifiedFill: '#1d9bf0',
  },
  dim: {
    cardBg: '#15202b',
    text: '#f7f9f9',
    muted: '#8b98a5',
    border: '#38444d',
    verifiedFill: '#1d9bf0',
  },
  dark: {
    cardBg: '#000000',
    text: '#e7e9ea',
    muted: '#71767b',
    border: '#2f3336',
    verifiedFill: '#1d9bf0',
  },
}

const BASE_FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Could not load image ${url}`))
    image.src = url
  })

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) => {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

// X premium posts can be up to 25,000 chars, which produces a wall of text
// that is unreadable as an image. Truncate anything longer than a normal
// tweet at the last sensible boundary before the limit and append an
// ellipsis so the card signals there is more to read on X.
const TRUNCATE_AT_CHARS = 280

const truncateLongText = (text: string): string => {
  if (text.length <= TRUNCATE_AT_CHARS) return text
  const slice = text.slice(0, TRUNCATE_AT_CHARS)
  const boundary = Math.max(
    slice.lastIndexOf(' '),
    slice.lastIndexOf('\n'),
    slice.lastIndexOf('.'),
    slice.lastIndexOf('!'),
    slice.lastIndexOf('?'),
  )
  const cutAt = boundary > TRUNCATE_AT_CHARS - 40 ? boundary : TRUNCATE_AT_CHARS
  return `${slice.slice(0, cutAt).trimEnd()}\u2026`
}

const wrapLines = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] => {
  const paragraphs = text.split('\n')
  const lines: string[] = []
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('')
      continue
    }
    const words = paragraph.split(/(\s+)/)
    let current = ''
    for (const word of words) {
      const next = current + word
      if (ctx.measureText(next).width > maxWidth && current) {
        lines.push(current.trimEnd())
        current = word.trimStart()
      } else {
        current = next
      }
    }
    if (current) lines.push(current.trimEnd())
  }
  return lines
}

const compactNumber = (value: number | null): string => {
  if (value == null) return ''
  if (value < 1000) return value.toString()
  if (value < 1_000_000)
    return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`
  return `${(value / 1_000_000).toFixed(value < 10_000_000 ? 1 : 0).replace(/\.0$/, '')}M`
}

const formatDate = (value: string | null): string => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const drawVerifiedBadge = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fill: string,
) => {
  const cx = x + size / 2
  const cy = y + size / 2
  const r = size / 2
  ctx.save()
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = Math.max(1, size / 9)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.35, cy)
  ctx.lineTo(cx - r * 0.05, cy + r * 0.3)
  ctx.lineTo(cx + r * 0.45, cy - r * 0.3)
  ctx.stroke()
  ctx.restore()
}

const drawAvatarCircle = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  cx: number,
  cy: number,
  size: number,
  tokens: ThemeTokens,
) => {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  if (image) {
    ctx.drawImage(image, cx - size / 2, cy - size / 2, size, size)
  } else {
    ctx.fillStyle = tokens.border
    ctx.fillRect(cx - size / 2, cy - size / 2, size, size)
  }
  ctx.restore()
}

export const renderTweetImage = async (
  post: TweetRenderData,
  options: RenderOptions,
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> => {
  const exportWidth = options.width ?? 1200
  const tokens = THEME_TOKENS[options.theme]

  const [avatar, postImage] = await Promise.all([
    post.avatar_url ? loadImage(post.avatar_url).catch(() => null) : null,
    post.image_url ? loadImage(post.image_url).catch(() => null) : null,
  ])

  const scale = exportWidth / 1200

  // Auto aspect: card spans the canvas minus a small edge padding.
  // Fixed aspects: cap the card at a natural tweet-card width and center it
  // so the card never stretches into an awkward ultrawide rectangle.
  const minHorizontalPadding = 40 * scale
  const maxCardWidth = 760 * scale
  const cardWidth =
    options.aspect === 'auto'
      ? exportWidth - minHorizontalPadding * 2
      : Math.min(maxCardWidth, exportWidth - minHorizontalPadding * 2)
  const horizontalPadding = (exportWidth - cardWidth) / 2
  const verticalPaddingFloor =
    options.aspect === 'auto' ? 40 * scale : 80 * scale
  const cardPadding = 40 * scale
  const avatarSize = 72 * scale
  const nameSize = 28 * scale
  const handleSize = 22 * scale
  const textSize = 32 * scale
  const lineHeight = Math.round(textSize * 1.35)
  const metaSize = 22 * scale
  const countsSize = 24 * scale

  const measurement = document.createElement('canvas').getContext('2d')
  if (!measurement) throw new Error('Canvas is not supported on this browser.')

  measurement.font = `400 ${textSize}px ${BASE_FONT_STACK}`
  const displayText = post.text ? truncateLongText(post.text) : ''
  const textLines = displayText
    ? wrapLines(measurement, displayText, cardWidth - cardPadding * 2)
    : []

  const headerHeight = avatarSize
  const textBlockHeight = textLines.length
    ? textLines.length * lineHeight + 20 * scale
    : 0

  let imageBlockHeight = 0
  if (postImage) {
    const maxImageWidth = cardWidth - cardPadding * 2
    const ratio = postImage.naturalHeight / postImage.naturalWidth
    imageBlockHeight = maxImageWidth * ratio
    const maxImageHeight = 700 * scale
    if (imageBlockHeight > maxImageHeight) {
      imageBlockHeight = maxImageHeight
    }
    imageBlockHeight += 24 * scale
  }

  const metaHeight = post.created_at ? metaSize + 20 * scale : 0
  const countsHeight = options.showCounts ? countsSize + 32 * scale : 0

  const cardHeight =
    cardPadding * 2 +
    headerHeight +
    textBlockHeight +
    imageBlockHeight +
    metaHeight +
    countsHeight

  // Canvas must be at least tall enough to fit the card plus vertical padding.
  // For fixed aspects we grow the canvas to the target height when the card is
  // smaller, and break the aspect ratio only when the content is taller than
  // the target (otherwise the card would clip).
  const cardNaturalHeight = cardHeight + verticalPaddingFloor * 2
  let canvasHeight = cardNaturalHeight
  let aspectPadTop = 0

  if (options.aspect !== 'auto') {
    const aspectRatio =
      options.aspect === 'square'
        ? 1
        : options.aspect === 'landscape'
          ? 16 / 9
          : 9 / 16
    const target = exportWidth / aspectRatio
    canvasHeight = Math.max(target, cardNaturalHeight)
    aspectPadTop = (canvasHeight - cardHeight) / 2 - verticalPaddingFloor
  }

  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(exportWidth * dpr)
  canvas.height = Math.round(canvasHeight * dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported on this browser.')
  ctx.scale(dpr, dpr)
  ctx.textBaseline = 'top'

  // Background
  if (options.background.kind === 'transparent') {
    ctx.clearRect(0, 0, exportWidth, canvasHeight)
  } else if (options.background.kind === 'solid') {
    ctx.fillStyle = options.background.color
    ctx.fillRect(0, 0, exportWidth, canvasHeight)
  } else {
    const gradient = ctx.createLinearGradient(0, 0, exportWidth, canvasHeight)
    gradient.addColorStop(0, options.background.from)
    gradient.addColorStop(1, options.background.to)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, exportWidth, canvasHeight)
  }

  const cardX = horizontalPadding
  const cardY = verticalPaddingFloor + aspectPadTop
  const radius = 24 * scale

  // Card shadow
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.18)'
  ctx.shadowBlur = 24 * scale
  ctx.shadowOffsetY = 8 * scale
  drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, radius)
  ctx.fillStyle = tokens.cardBg
  ctx.fill()
  ctx.restore()

  // Header
  const innerX = cardX + cardPadding
  const innerY = cardY + cardPadding
  const avatarCx = innerX + avatarSize / 2
  const avatarCy = innerY + avatarSize / 2
  drawAvatarCircle(ctx, avatar, avatarCx, avatarCy, avatarSize, tokens)

  const nameX = innerX + avatarSize + 20 * scale
  ctx.fillStyle = tokens.text
  ctx.font = `700 ${nameSize}px ${BASE_FONT_STACK}`
  const nameY = innerY + 6 * scale
  ctx.fillText(
    post.author_name || post.author_handle || 'unknown',
    nameX,
    nameY,
  )
  const nameWidth = ctx.measureText(
    post.author_name || post.author_handle || 'unknown',
  ).width

  if (post.verified) {
    const badgeSize = nameSize * 0.95
    drawVerifiedBadge(
      ctx,
      nameX + nameWidth + 8 * scale,
      nameY + (nameSize - badgeSize) / 2,
      badgeSize,
      tokens.verifiedFill,
    )
  }

  ctx.fillStyle = tokens.muted
  ctx.font = `400 ${handleSize}px ${BASE_FONT_STACK}`
  ctx.fillText(`@${post.author_handle}`, nameX, nameY + nameSize + 6 * scale)

  // Body text
  let cursorY = innerY + headerHeight + 20 * scale
  if (textLines.length) {
    ctx.fillStyle = tokens.text
    ctx.font = `400 ${textSize}px ${BASE_FONT_STACK}`
    for (const line of textLines) {
      ctx.fillText(line, innerX, cursorY)
      cursorY += lineHeight
    }
    cursorY += 20 * scale
  }

  // Image
  if (postImage && imageBlockHeight > 0) {
    const maxImageWidth = cardWidth - cardPadding * 2
    const drawHeight = imageBlockHeight - 24 * scale
    const drawWidth =
      (postImage.naturalWidth / postImage.naturalHeight) * drawHeight
    const actualWidth = Math.min(drawWidth, maxImageWidth)
    const actualHeight = drawHeight * (actualWidth / drawWidth)
    const imageX = innerX + (maxImageWidth - actualWidth) / 2
    const imageY = cursorY
    ctx.save()
    drawRoundedRect(ctx, imageX, imageY, actualWidth, actualHeight, 16 * scale)
    ctx.clip()
    ctx.drawImage(postImage, imageX, imageY, actualWidth, actualHeight)
    ctx.restore()
    ctx.strokeStyle = tokens.border
    ctx.lineWidth = 1
    drawRoundedRect(ctx, imageX, imageY, actualWidth, actualHeight, 16 * scale)
    ctx.stroke()
    cursorY = imageY + actualHeight + 24 * scale
  }

  // Meta (date)
  if (post.created_at) {
    ctx.fillStyle = tokens.muted
    ctx.font = `400 ${metaSize}px ${BASE_FONT_STACK}`
    ctx.fillText(formatDate(post.created_at), innerX, cursorY)
    cursorY += metaSize + 20 * scale
  }

  // Counts
  if (options.showCounts) {
    const parts: Array<{ label: string; value: string }> = []
    if (post.reply_count != null) {
      parts.push({ label: 'Replies', value: compactNumber(post.reply_count) })
    }
    if (post.retweet_count != null) {
      parts.push({ label: 'Reposts', value: compactNumber(post.retweet_count) })
    }
    if (post.like_count != null) {
      parts.push({ label: 'Likes', value: compactNumber(post.like_count) })
    }
    if (post.view_count != null) {
      parts.push({ label: 'Views', value: compactNumber(post.view_count) })
    }
    if (parts.length) {
      ctx.fillStyle = tokens.muted
      ctx.font = `400 ${countsSize}px ${BASE_FONT_STACK}`
      let xCursor = innerX
      for (let i = 0; i < parts.length; i += 1) {
        const part = parts[i]
        const valueText = part.value
        ctx.fillStyle = tokens.text
        ctx.font = `700 ${countsSize}px ${BASE_FONT_STACK}`
        ctx.fillText(valueText, xCursor, cursorY)
        const valueWidth = ctx.measureText(valueText).width
        ctx.fillStyle = tokens.muted
        ctx.font = `400 ${countsSize}px ${BASE_FONT_STACK}`
        ctx.fillText(` ${part.label}`, xCursor + valueWidth, cursorY)
        const labelWidth = ctx.measureText(` ${part.label}`).width
        xCursor += valueWidth + labelWidth + 24 * scale
      }
    }
  }

  return { canvas, width: exportWidth, height: canvasHeight }
}

export const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Could not export the image.'))
    }, 'image/png')
  })
