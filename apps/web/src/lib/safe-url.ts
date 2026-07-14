export type SafePublicHttpUrlError =
  | 'invalid_url'
  | 'invalid_protocol'
  | 'unsafe_auth'
  | 'unsafe_host'
  | 'unsafe_ipv4'
  | 'unsafe_ipv6'
export type PublicUrlError = 'invalid_url' | 'unsafe_url'

const isIpv4 = (hostname: string) => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
const isPrivateIpv4 = (hostname: string) => {
  const octets = hostname.split('.').map(Number)
  if (
    octets.length !== 4 ||
    octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
  )
    return false
  const [a, b] = octets
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  )
}
const isBlockedIpv6 = (hostname: string) => {
  const value = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  return (
    value.includes(':') &&
    (value === '::1' ||
      value === '::' ||
      value.startsWith('fc') ||
      value.startsWith('fd') ||
      /^fe[89ab]/.test(value))
  )
}

export const mapSafePublicHttpUrlError = (
  error: SafePublicHttpUrlError,
): PublicUrlError =>
  error === 'invalid_url' || error === 'invalid_protocol'
    ? 'invalid_url'
    : 'unsafe_url'

export const ensureSafePublicHttpUrl = (
  rawUrl: string,
):
  | { ok: true; normalizedUrl: string; url: URL }
  | { ok: false; error: SafePublicHttpUrlError } => {
  let url: URL
  try {
    url = new URL(rawUrl.trim())
  } catch {
    return { ok: false, error: 'invalid_url' }
  }
  if (!['http:', 'https:'].includes(url.protocol))
    return { ok: false, error: 'invalid_protocol' }
  if (url.username || url.password) return { ok: false, error: 'unsafe_auth' }
  url.hash = ''
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.home.arpa')
  )
    return { ok: false, error: 'unsafe_host' }
  if (isIpv4(hostname) && isPrivateIpv4(hostname))
    return { ok: false, error: 'unsafe_ipv4' }
  if (isBlockedIpv6(hostname)) return { ok: false, error: 'unsafe_ipv6' }
  return { ok: true, normalizedUrl: url.toString(), url }
}
