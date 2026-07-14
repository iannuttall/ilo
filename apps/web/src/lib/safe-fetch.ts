import {
  ensureSafePublicHttpUrl,
  mapSafePublicHttpUrlError,
  type SafePublicHttpUrlError,
} from './safe-url'

const MAX_REDIRECTS = 5
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

export type SafeFetchError =
  | 'invalid_url'
  | 'unsafe_url'
  | 'blocked_domain'
  | 'redirect_missing_location'
  | 'too_many_redirects'

export type SafeFetchResult =
  | { ok: true; response: Response; url: string }
  | { ok: false; error: SafeFetchError; url: string }

const mapSafeUrlError = (error: SafePublicHttpUrlError): SafeFetchError => {
  return mapSafePublicHttpUrlError(error)
}

const resolveSafeTarget = (
  rawUrl: string,
):
  | { ok: true; url: string }
  | { ok: false; error: SafeFetchError; url: string } => {
  const safe = ensureSafePublicHttpUrl(rawUrl)
  if (!safe.ok) {
    return {
      ok: false,
      error: mapSafeUrlError(safe.error),
      url: rawUrl.trim(),
    }
  }
  return { ok: true, url: safe.normalizedUrl }
}

export const fetchSafeExternalUrl = async (
  rawUrl: string,
  init: RequestInit = {},
): Promise<SafeFetchResult> => {
  const initial = resolveSafeTarget(rawUrl)
  if (!initial.ok) return initial

  let currentUrl = initial.url
  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    const headers = new Headers(init.headers)
    if (!headers.has('user-agent')) {
      headers.set('user-agent', DEFAULT_USER_AGENT)
    }
    const response = await fetch(currentUrl, {
      ...init,
      headers,
      redirect: 'manual',
    })
    if (!REDIRECT_STATUSES.has(response.status)) {
      return { ok: true, response, url: currentUrl }
    }

    const location = response.headers.get('location')?.trim()
    if (!location) {
      return { ok: false, error: 'redirect_missing_location', url: currentUrl }
    }

    if (redirectCount === MAX_REDIRECTS) {
      return { ok: false, error: 'too_many_redirects', url: currentUrl }
    }

    const nextUrl = new URL(location, currentUrl).toString()
    const safe = resolveSafeTarget(nextUrl)
    if (!safe.ok) {
      return { ok: false, error: safe.error, url: safe.url }
    }
    // Preserve the exact redirect target the origin gave us. Re-normalizing here
    // can turn meaningful path changes like a required trailing slash back into
    // our canonical form and create a fake redirect loop.
    currentUrl = nextUrl
  }

  return { ok: false, error: 'too_many_redirects', url: currentUrl }
}
