import { parseHTML } from 'linkedom/worker'
import { turndownHtml } from './turndown'

const MARKDOWN_CONTENT_SELECTORS = ['[data-agent-content]', 'main', 'article']
const DROP_FROM_MARKDOWN_SELECTOR = [
  'script',
  'style',
  'noscript',
  'template',
  'nav',
  'footer',
  'form',
  'input',
  'textarea',
  'select',
  'button',
  'canvas',
  'svg',
  '[hidden]',
  '[aria-hidden="true"]',
  '[data-agent-hidden]',
].join(',')

type AcceptPreference = {
  type: string
  q: number
  index: number
}

const parseAcceptHeader = (accept: string): AcceptPreference[] =>
  accept
    .split(',')
    .map((part, index) => {
      const [rawType, ...params] = part.trim().split(';')
      const qParam = params.find((param) => param.trim().startsWith('q='))
      const q = qParam ? Number(qParam.trim().slice(2)) : 1
      return {
        type: rawType.trim().toLowerCase(),
        q: Number.isFinite(q) ? q : 0,
        index,
      }
    })
    .filter((item) => item.type && item.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)

export const prefersMarkdown = (request: Request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false

  const accept = request.headers.get('accept')
  if (!accept) return false

  const preferences = parseAcceptHeader(accept)
  const markdown = preferences.find((item) => item.type === 'text/markdown')
  if (!markdown) return false

  const html = preferences.find(
    (item) =>
      item.type === 'text/html' || item.type === 'application/xhtml+xml',
  )
  return !html || markdown.q >= html.q
}

export const requestsMarkdown = (request: Request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false

  const url = new URL(request.url)
  return url.searchParams.has('markdown') || prefersMarkdown(request)
}

const isHtmlResponse = (response: Response) => {
  const contentType = response.headers.get('content-type')?.toLowerCase() || ''
  return contentType.includes('text/html')
}

const appendVaryAccept = (headers: Headers) => {
  const vary = headers.get('vary')
  if (!vary) {
    headers.set('vary', 'accept')
    return
  }

  const values = vary.split(',').map((value) => value.trim().toLowerCase())
  if (!values.includes('accept') && !values.includes('*')) {
    headers.set('vary', `${vary}, accept`)
  }
}

const estimateTokenCount = (markdown: string) =>
  Math.max(1, Math.ceil(markdown.length / 4))

const normalizeMarkdown = (markdown: string) =>
  markdown.trim().replace(/\n{3,}/g, '\n\n')

const escapeTableCell = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|')

const normalizeTableCellText = (cell: Element) => {
  const labelled = Array.from(cell.querySelectorAll('[aria-label]'))
    .map((element) => element.getAttribute('aria-label') || '')
    .filter(Boolean)

  const text = labelled.length > 0 ? labelled.join(' ') : cell.textContent || ''
  return escapeTableCell(
    text
      .replace(/\bPartial: Partial\b/g, 'Partial')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

const renderMarkdownTable = (table: Element) => {
  const rows = Array.from(table.querySelectorAll('tr'))
    .map((row) =>
      Array.from(row.children)
        .filter(
          (cell) =>
            cell.tagName.toLowerCase() === 'th' ||
            cell.tagName.toLowerCase() === 'td',
        )
        .map((cell) => normalizeTableCellText(cell)),
    )
    .filter((row) => row.length > 0)

  if (rows.length === 0) return ''

  const columnCount = Math.max(...rows.map((row) => row.length))
  const normalizedRows = rows.map((row) => [
    ...row,
    ...Array.from({ length: columnCount - row.length }, () => ''),
  ])
  const [header, ...body] = normalizedRows
  const separator = Array.from({ length: columnCount }, () => '---')
  const renderRow = (row: string[]) => `| ${row.join(' | ')} |`

  return [renderRow(header), renderRow(separator), ...body.map(renderRow)].join(
    '\n',
  )
}

export const renderAgentMarkdownFromHtml = async (html: string) => {
  const { document } = parseHTML(html)
  const content = MARKDOWN_CONTENT_SELECTORS.map((selector) =>
    document.querySelector(selector),
  ).find((element): element is Element => Boolean(element))
  if (!content) return null

  const clone = content.cloneNode(true) as Element
  clone.querySelectorAll(DROP_FROM_MARKDOWN_SELECTOR).forEach((element) => {
    element.remove()
  })

  const markdown = normalizeMarkdown(
    await turndownHtml(clone, (service) => {
      service.addRule('agentTable', {
        filter: 'table',
        replacement: (_content, node) => {
          const table = node as Element
          const rendered = renderMarkdownTable(table)
          return rendered ? `\n\n${rendered}\n\n` : ''
        },
      })
      service.remove(['script', 'style', 'button'])
    }),
  )

  return markdown || null
}

const rebuildHtmlResponse = (response: Response, html: string) =>
  new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })

export const maybeServeMarkdownResponse = async (
  request: Request,
  response: Response,
) => {
  if (
    !requestsMarkdown(request) ||
    !isHtmlResponse(response) ||
    !response.body
  ) {
    return response
  }

  const html = await response.text()
  const markdown = await renderAgentMarkdownFromHtml(html)
  if (!markdown) return rebuildHtmlResponse(response, html)

  const headers = new Headers(response.headers)
  headers.set('content-type', 'text/markdown; charset=utf-8')
  headers.set('x-markdown-tokens', String(estimateTokenCount(markdown)))
  headers.delete('content-length')
  headers.delete('content-encoding')
  appendVaryAccept(headers)

  return new Response(request.method === 'HEAD' ? null : markdown, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
