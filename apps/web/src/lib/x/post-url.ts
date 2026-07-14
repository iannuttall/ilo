// Shared helpers for parsing X/Twitter post URLs into a numeric post ID.
// Used by every public tool that accepts a tweet link (video, thread reader,
// tweet-to-image, ...). Keep this the single source of truth so the list of
// supported mirror hosts and the ID shape stay consistent across tools.

export const TWEET_ID_PATTERN = /^\d{1,25}$/

export const X_POST_ALLOWED_HOSTS = new Set([
  'x.com',
  'twitter.com',
  'mobile.twitter.com',
  'fxtwitter.com',
  'vxtwitter.com',
  'fixupx.com',
  'fixvx.com',
])

export const extractXPostId = (raw: string): string | null => {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (TWEET_ID_PATTERN.test(trimmed)) return trimmed

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  if (!X_POST_ALLOWED_HOSTS.has(host)) return null

  const parts = url.pathname.split('/').filter(Boolean)
  const statusIndex = parts.findIndex(
    (part) => part === 'status' || part === 'statuses',
  )
  if (statusIndex >= 0) {
    const id = parts[statusIndex + 1]
    if (id && TWEET_ID_PATTERN.test(id)) return id
  }
  return null
}
