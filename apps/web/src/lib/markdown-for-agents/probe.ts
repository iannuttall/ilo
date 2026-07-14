import { fetchSafeExternalUrl } from '../safe-fetch'
import { deriveMdVariant, getOriginUrl } from '../url-normalize'

const PROBE_TIMEOUT_MS = 6_000
const PREVIEW_CHAR_CAP = 400

export type ProbeStatus = 'pass' | 'fail' | 'blocked' | 'info'

export type ProbeEvidence = {
  request: {
    method: 'GET'
    url: string
    accept: string | null
  }
  response: {
    status: number
    contentType: string | null
    headers: Record<string, string>
    preview: string
    previewTruncated: boolean
  } | null
  error: string | null
}

export type ProbeCheck = {
  id: string
  label: string
  category: 'delivery' | 'discovery'
  kind: 'primary' | 'informational'
  status: ProbeStatus
  summary: string
  evidence: ProbeEvidence
}

type ProbeResult = {
  ok: boolean
  finalUrl: string
  status: number
  contentType: string | null
  headers: Record<string, string>
  body: string
  bodyTruncated: boolean
  blocked: boolean
  error: string | null
}

const INTERESTING_HEADERS = [
  'content-type',
  'content-length',
  'vary',
  'link',
  'server',
  'x-markdown-tokens',
  'content-signal',
  'cf-ray',
  'cf-cache-status',
]

const pickHeaders = (headers: Headers): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const name of INTERESTING_HEADERS) {
    const value = headers.get(name)
    if (value) out[name] = value
  }
  return out
}

const isBlockedStatus = (status: number) =>
  status === 403 || status === 429 || status === 503

const looksLikeBotFight = (body: string, headers: Headers) => {
  const cfRay = headers.get('cf-ray')
  const server = headers.get('server')?.toLowerCase() ?? ''
  const hay = body.slice(0, 2_000).toLowerCase()
  if (cfRay && hay.includes('attention required')) return true
  if (server.includes('cloudflare') && hay.includes('just a moment'))
    return true
  if (hay.includes('akamai reference')) return true
  if (hay.includes('access denied') && server.includes('cloudflare'))
    return true
  return false
}

// Do a single safe fetch with a short timeout. Collects the pieces every check
// in this module needs: final URL after redirects, status, interesting
// response headers, a truncated body preview, and a blocked-by-origin flag.
const probeFetch = async (
  url: string,
  accept: string | null,
): Promise<ProbeResult> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  try {
    const headers: Record<string, string> = {}
    if (accept) headers.accept = accept
    const result = await fetchSafeExternalUrl(url, {
      signal: controller.signal,
      headers,
    })
    if (!result.ok) {
      return {
        ok: false,
        finalUrl: url,
        status: 0,
        contentType: null,
        headers: {},
        body: '',
        bodyTruncated: false,
        blocked: false,
        error: result.error,
      }
    }
    const text = await result.response.text()
    const truncated = text.length > PREVIEW_CHAR_CAP
    const preview = truncated ? text.slice(0, PREVIEW_CHAR_CAP) : text
    const status = result.response.status
    const responseHeaders = result.response.headers
    const blocked =
      isBlockedStatus(status) || looksLikeBotFight(text, responseHeaders)
    return {
      ok: status >= 200 && status < 400,
      finalUrl: result.url,
      status,
      contentType: responseHeaders.get('content-type'),
      headers: pickHeaders(responseHeaders),
      body: preview,
      bodyTruncated: truncated,
      blocked,
      error: null,
    }
  } catch (err) {
    return {
      ok: false,
      finalUrl: url,
      status: 0,
      contentType: null,
      headers: {},
      body: '',
      bodyTruncated: false,
      blocked: false,
      error: err instanceof Error ? err.message : 'fetch_failed',
    }
  } finally {
    clearTimeout(timer)
  }
}

const evidenceFrom = (
  url: string,
  accept: string | null,
  result: ProbeResult,
): ProbeEvidence => ({
  request: { method: 'GET', url, accept },
  response:
    result.status > 0
      ? {
          status: result.status,
          contentType: result.contentType,
          headers: result.headers,
          preview: result.body,
          previewTruncated: result.bodyTruncated,
        }
      : null,
  error: result.error,
})

const isMarkdownContentType = (contentType: string | null) => {
  if (!contentType) return false
  const main = contentType.split(';')[0].trim().toLowerCase()
  return main === 'text/markdown' || main === 'text/x-markdown'
}

const isJsonContentType = (contentType: string | null) => {
  if (!contentType) return false
  const main = contentType.split(';')[0].trim().toLowerCase()
  return main === 'application/json' || main.endsWith('+json')
}

const looksLikeMarkdownBody = (body: string) => {
  const sample = body.slice(0, 400).trim()
  if (!sample) return false
  // Very loose: any markdown heading or fenced block in the first 400 chars.
  return /(^|\n)#{1,6}\s/.test(sample) || /```/.test(sample)
}

const hasHtmlAlternateMarkdown = (body: string): string | null => {
  // Scan <head> for <link rel="alternate" type="text/markdown" href="...">.
  // Loose regex, tolerant of attribute order and quote style.
  const linkTagRegex = /<link\b[^>]*>/gi
  for (const match of body.matchAll(linkTagRegex)) {
    const tag = match[0]
    const rel = /\brel\s*=\s*["']?([^"'\s>]+)/i.exec(tag)?.[1]?.toLowerCase()
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(tag)?.[1]?.toLowerCase()
    const href = /\bhref\s*=\s*["']?([^"'\s>]+)/i.exec(tag)?.[1]
    if (!rel?.split(/\s+/).includes('alternate')) continue
    if (type === 'text/markdown' || type === 'text/x-markdown') {
      return href ?? ''
    }
    if (type === undefined && href && /\.md(\?|#|$)/i.test(href)) {
      return href
    }
  }
  return null
}

// Parse RFC 8288 Link header entries and return the first that declares
// rel=alternate + type=text/markdown.
const hasHttpLinkAlternateMarkdown = (linkHeader: string | undefined) => {
  if (!linkHeader) return null
  const entries = linkHeader.split(',')
  for (const entry of entries) {
    const trimmed = entry.trim()
    if (!trimmed) continue
    const uriMatch = /<([^>]+)>/.exec(trimmed)
    if (!uriMatch) continue
    const params = trimmed.slice(uriMatch[0].length).split(';')
    let rel: string | null = null
    let type: string | null = null
    for (const p of params) {
      const kv = p.trim()
      if (!kv) continue
      const relM = /^rel\s*=\s*"?([^";]+)"?/i.exec(kv)
      if (relM) rel = relM[1].toLowerCase()
      const typeM = /^type\s*=\s*"?([^";]+)"?/i.exec(kv)
      if (typeM) type = typeM[1].toLowerCase()
    }
    if (
      rel?.split(/\s+/).includes('alternate') &&
      (type === 'text/markdown' || type === 'text/x-markdown')
    ) {
      return uriMatch[1]
    }
  }
  return null
}

export type ChecksReport = {
  url: string
  finalUrl: string
  checks: ProbeCheck[]
  summary: { passed: number; primary: number }
}

export const runMarkdownForAgentsChecks = async (
  url: string,
): Promise<ChecksReport> => {
  const origin = getOriginUrl(url)
  const mdVariantUrl = deriveMdVariant(url)

  const htmlAccept = 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5'
  const mdAccept = 'text/markdown, text/plain;q=0.9, text/html;q=0.1'
  const jsonAccept = 'application/json, */*;q=0.1'

  const [
    mdFetch,
    htmlFetch,
    mdVariantFetch,
    llmsTxtFetch,
    mcpFetch,
    agentFetch,
  ] = await Promise.all([
    probeFetch(url, mdAccept),
    probeFetch(url, htmlAccept),
    mdVariantUrl
      ? probeFetch(mdVariantUrl, mdAccept)
      : Promise.resolve<ProbeResult>({
          ok: false,
          finalUrl: '',
          status: 0,
          contentType: null,
          headers: {},
          body: '',
          bodyTruncated: false,
          blocked: false,
          error: 'invalid_url',
        }),
    origin
      ? probeFetch(`${origin}/llms.txt`, 'text/plain, text/markdown, */*;q=0.1')
      : Promise.resolve<ProbeResult>({
          ok: false,
          finalUrl: '',
          status: 0,
          contentType: null,
          headers: {},
          body: '',
          bodyTruncated: false,
          blocked: false,
          error: 'invalid_origin',
        }),
    origin
      ? probeFetch(`${origin}/.well-known/mcp/server-card.json`, jsonAccept)
      : Promise.resolve<ProbeResult>({
          ok: false,
          finalUrl: '',
          status: 0,
          contentType: null,
          headers: {},
          body: '',
          bodyTruncated: false,
          blocked: false,
          error: 'invalid_origin',
        }),
    origin
      ? probeFetch(`${origin}/agent.json`, jsonAccept)
      : Promise.resolve<ProbeResult>({
          ok: false,
          finalUrl: '',
          status: 0,
          contentType: null,
          headers: {},
          body: '',
          bodyTruncated: false,
          blocked: false,
          error: 'invalid_origin',
        }),
  ])

  const checks: ProbeCheck[] = []

  // 1. Accept: text/markdown negotiation
  {
    const status: ProbeStatus = mdFetch.blocked
      ? 'blocked'
      : mdFetch.ok &&
          (isMarkdownContentType(mdFetch.contentType) ||
            looksLikeMarkdownBody(mdFetch.body))
        ? 'pass'
        : 'fail'
    const summary =
      status === 'pass'
        ? `Site returned Markdown (${mdFetch.contentType ?? 'no content-type'}).`
        : status === 'blocked'
          ? 'Origin blocked our probe.'
          : mdFetch.ok
            ? 'Site returned HTML, not Markdown.'
            : mdFetch.error
              ? `Request failed: ${mdFetch.error}.`
              : 'Request failed.'
    checks.push({
      id: 'accept-markdown',
      label: 'Accept: text/markdown negotiation',
      category: 'delivery',
      kind: 'primary',
      status,
      summary,
      evidence: evidenceFrom(url, mdAccept, mdFetch),
    })
  }

  // 2. .md variant at same path
  {
    const probed = mdVariantUrl ?? url
    const status: ProbeStatus = mdVariantFetch.blocked
      ? 'blocked'
      : mdVariantFetch.ok &&
          (isMarkdownContentType(mdVariantFetch.contentType) ||
            looksLikeMarkdownBody(mdVariantFetch.body))
        ? 'pass'
        : 'fail'
    const summary =
      status === 'pass'
        ? `${probed} returned Markdown.`
        : status === 'blocked'
          ? 'Origin blocked our probe.'
          : mdVariantFetch.status === 404
            ? `${probed} returned 404.`
            : mdVariantFetch.ok
              ? 'URL returned something, but not Markdown.'
              : mdVariantFetch.error
                ? `Request failed: ${mdVariantFetch.error}.`
                : 'Request failed.'
    checks.push({
      id: 'md-variant',
      label: '.md variant at same path',
      category: 'delivery',
      kind: 'primary',
      status,
      summary,
      evidence: evidenceFrom(probed, mdAccept, mdVariantFetch),
    })
  }

  // 3. HTML <link rel="alternate" type="text/markdown">
  {
    let status: ProbeStatus
    let summary: string
    if (htmlFetch.blocked) {
      status = 'blocked'
      summary = 'Origin blocked our probe.'
    } else if (!htmlFetch.ok) {
      status = 'fail'
      summary = htmlFetch.error
        ? `Could not fetch HTML: ${htmlFetch.error}.`
        : 'Could not fetch HTML to inspect.'
    } else {
      const href = hasHtmlAlternateMarkdown(htmlFetch.body)
      status = href !== null ? 'pass' : 'fail'
      summary =
        href !== null
          ? `Found <link rel="alternate" type="text/markdown" href="${href}">.`
          : 'No <link rel="alternate" type="text/markdown"> in HTML head.'
    }
    checks.push({
      id: 'html-alternate',
      label: 'HTML <link rel="alternate" type="text/markdown">',
      category: 'delivery',
      kind: 'primary',
      status,
      summary,
      evidence: evidenceFrom(url, htmlAccept, htmlFetch),
    })
  }

  // 4. HTTP Link: header alternate (RFC 8288)
  {
    let status: ProbeStatus
    let summary: string
    if (htmlFetch.blocked) {
      status = 'blocked'
      summary = 'Origin blocked our probe.'
    } else if (!htmlFetch.ok) {
      status = 'fail'
      summary = htmlFetch.error
        ? `Could not fetch HTML: ${htmlFetch.error}.`
        : 'Could not fetch HTML to inspect.'
    } else {
      const linkHeader = htmlFetch.headers.link
      const match = hasHttpLinkAlternateMarkdown(linkHeader)
      status = match ? 'pass' : 'fail'
      summary = match
        ? `Link header points to ${match}.`
        : linkHeader
          ? 'Link header present, but no rel=alternate; type="text/markdown" entry.'
          : 'No Link response header set.'
    }
    checks.push({
      id: 'link-header',
      label: 'HTTP Link: header alternate',
      category: 'delivery',
      kind: 'primary',
      status,
      summary,
      evidence: evidenceFrom(url, htmlAccept, htmlFetch),
    })
  }

  // 5. Vary: Accept (informational)
  {
    // Prefer the Vary header from the markdown-accept response because that is
    // the request that would be affected by content negotiation. Fall back to
    // the HTML fetch if the markdown request did not succeed.
    const source = mdFetch.status > 0 ? mdFetch : htmlFetch
    const vary = source.headers.vary?.toLowerCase() ?? ''
    const includesAccept = vary.split(',').some((v) => v.trim() === 'accept')
    checks.push({
      id: 'vary-accept',
      label: 'Vary: Accept response header',
      category: 'delivery',
      kind: 'informational',
      status: includesAccept ? 'pass' : 'info',
      summary: includesAccept
        ? `Vary header includes Accept (${source.headers.vary}).`
        : source.headers.vary
          ? `Vary header set, but does not include Accept (${source.headers.vary}).`
          : 'No Vary header set.',
      evidence: evidenceFrom(
        url,
        source === mdFetch ? mdAccept : htmlAccept,
        source,
      ),
    })
  }

  // 6. Cloudflare markdown signals (informational)
  {
    const xm =
      mdFetch.headers['x-markdown-tokens'] ??
      htmlFetch.headers['x-markdown-tokens'] ??
      null
    const contentSignal =
      mdFetch.headers['content-signal'] ??
      htmlFetch.headers['content-signal'] ??
      null
    const parts: string[] = []
    if (xm) parts.push(`x-markdown-tokens: ${xm}`)
    if (contentSignal) parts.push(`Content-Signal: ${contentSignal}`)
    const source = mdFetch.status > 0 ? mdFetch : htmlFetch
    checks.push({
      id: 'cloudflare-signals',
      label: 'Cloudflare markdown signals',
      category: 'delivery',
      kind: 'informational',
      status: parts.length > 0 ? 'pass' : 'info',
      summary: parts.length
        ? parts.join(' · ')
        : 'No x-markdown-tokens or Content-Signal headers on the response.',
      evidence: evidenceFrom(
        url,
        source === mdFetch ? mdAccept : htmlAccept,
        source,
      ),
    })
  }

  // 7. /llms.txt presence
  {
    const llmsTxtUrl = origin ? `${origin}/llms.txt` : url
    let status: ProbeStatus
    let summary: string
    if (!origin) {
      status = 'fail'
      summary = 'Could not derive origin from URL.'
    } else if (llmsTxtFetch.blocked) {
      status = 'blocked'
      summary = 'Origin blocked our probe.'
    } else if (!llmsTxtFetch.ok) {
      status = 'fail'
      summary =
        llmsTxtFetch.status === 404
          ? `${llmsTxtUrl} returned 404.`
          : llmsTxtFetch.error
            ? `Request failed: ${llmsTxtFetch.error}.`
            : `Request failed (${llmsTxtFetch.status}).`
    } else {
      // Smell test: llms.txt should start with an H1 per the spec.
      const looksReal = /^\s*#\s+\S/.test(llmsTxtFetch.body)
      status = looksReal ? 'pass' : 'fail'
      summary = looksReal
        ? `Found ${llmsTxtUrl}.`
        : `${llmsTxtUrl} returned 200 but body does not look like llms.txt.`
    }
    checks.push({
      id: 'llms-txt',
      label: '/llms.txt present',
      category: 'discovery',
      kind: 'primary',
      status,
      summary,
      evidence: evidenceFrom(
        llmsTxtUrl,
        'text/plain, text/markdown, */*;q=0.1',
        llmsTxtFetch,
      ),
    })
  }

  // 8. /.well-known/mcp/server-card.json
  {
    const mcpUrl = origin ? `${origin}/.well-known/mcp/server-card.json` : url
    let status: ProbeStatus
    let summary: string
    if (!origin) {
      status = 'fail'
      summary = 'Could not derive origin from URL.'
    } else if (mcpFetch.blocked) {
      status = 'blocked'
      summary = 'Origin blocked our probe.'
    } else if (!mcpFetch.ok) {
      status = 'fail'
      summary =
        mcpFetch.status === 404
          ? `${mcpUrl} returned 404.`
          : mcpFetch.error
            ? `Request failed: ${mcpFetch.error}.`
            : `Request failed (${mcpFetch.status}).`
    } else {
      try {
        const parsed = JSON.parse(mcpFetch.body) as Record<string, unknown>
        status = 'pass'
        const name = typeof parsed.name === 'string' ? parsed.name : null
        summary = name
          ? `Found MCP server card for "${name}".`
          : `Found MCP server card at ${mcpUrl}.`
      } catch {
        status = 'fail'
        summary = isJsonContentType(mcpFetch.contentType)
          ? `${mcpUrl} returned invalid JSON.`
          : `${mcpUrl} returned 200 but body is not JSON.`
      }
    }
    checks.push({
      id: 'well-known-mcp',
      label: '/.well-known/mcp/server-card.json',
      category: 'discovery',
      kind: 'primary',
      status,
      summary,
      evidence: evidenceFrom(mcpUrl, 'application/json, */*;q=0.1', mcpFetch),
    })
  }

  // 9. /agent.json (Google A2A)
  {
    const agentUrl = origin ? `${origin}/agent.json` : url
    let status: ProbeStatus
    let summary: string
    if (!origin) {
      status = 'fail'
      summary = 'Could not derive origin from URL.'
    } else if (agentFetch.blocked) {
      status = 'blocked'
      summary = 'Origin blocked our probe.'
    } else if (!agentFetch.ok) {
      status = 'fail'
      summary =
        agentFetch.status === 404
          ? `${agentUrl} returned 404.`
          : agentFetch.error
            ? `Request failed: ${agentFetch.error}.`
            : `Request failed (${agentFetch.status}).`
    } else {
      try {
        const parsed = JSON.parse(agentFetch.body) as Record<string, unknown>
        status = 'pass'
        const skills = Array.isArray(parsed.skills)
          ? parsed.skills.length
          : null
        const name = typeof parsed.name === 'string' ? parsed.name : null
        summary = [
          name ? `Found agent.json for "${name}"` : 'Found agent.json',
          skills !== null ? `${skills} skills declared` : null,
        ]
          .filter(Boolean)
          .join(', ')
          .concat('.')
      } catch {
        status = 'fail'
        summary = isJsonContentType(agentFetch.contentType)
          ? `${agentUrl} returned invalid JSON.`
          : `${agentUrl} returned 200 but body is not JSON.`
      }
    }
    checks.push({
      id: 'agent-json',
      label: '/agent.json',
      category: 'discovery',
      kind: 'primary',
      status,
      summary,
      evidence: evidenceFrom(
        agentUrl,
        'application/json, */*;q=0.1',
        agentFetch,
      ),
    })
  }

  const primary = checks.filter((c) => c.kind === 'primary')
  const passed = primary.filter((c) => c.status === 'pass').length

  // Prefer the final URL from the HTML fetch if it ran, otherwise the markdown
  // fetch, otherwise the original.
  const finalUrl =
    (htmlFetch.finalUrl && htmlFetch.status > 0 ? htmlFetch.finalUrl : null) ??
    (mdFetch.finalUrl && mdFetch.status > 0 ? mdFetch.finalUrl : null) ??
    url

  return {
    url,
    finalUrl,
    checks,
    summary: { passed, primary: primary.length },
  }
}
