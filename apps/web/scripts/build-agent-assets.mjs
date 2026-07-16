import { createHash } from 'node:crypto'
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseHTML } from 'linkedom'
import TurndownService from 'turndown'

const root = process.cwd()
const output = path.join(root, 'dist', 'client')
const site = new URL(process.env.SITE_URL ?? 'https://ilo.so')
const skillSource = path.resolve(root, '../../skills/ilo/SKILL.md')
const skillOutput = path.join(
  output,
  '.well-known',
  'agent-skills',
  'ilo',
  'SKILL.md',
)

const exclusions = [
  'script',
  'style',
  'template',
  'noscript',
  'nav',
  'footer',
  'svg',
  'canvas',
  'form',
  'button',
  '[hidden]',
  '[aria-hidden="true"]',
  '[data-agent-hidden]',
  '[data-code-copy]',
]

const walkHtml = async (directory) => {
  const files = []
  const walk = async (current) => {
    const entries = await readdir(current, { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name, 'en-US'))
    for (const entry of entries) {
      const file = path.join(current, entry.name)
      if (entry.isDirectory()) await walk(file)
      else if (entry.isFile() && entry.name.endsWith('.html')) files.push(file)
    }
  }
  await walk(directory)
  return files
}

const yaml = (value) => JSON.stringify(value.replace(/\r\n?/g, '\n'))
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const normalizeMarkdown = (value) =>
  `${value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`

const markdownRoute = (pathname) => {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return { path: '/index.md', file: 'index.md' }
  const last = `${segments.pop()}.md`
  const parts = [...segments, last]
  return { path: `/${parts.join('/')}`, file: parts.join(path.sep) }
}

const tableMarkdown = (table) => {
  const rows = Array.from(table.querySelectorAll('tr'))
    .map((row) =>
      Array.from(row.children)
        .filter((cell) => ['th', 'td'].includes(cell.tagName.toLowerCase()))
        .map((cell) =>
          (cell.textContent ?? '')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\\/g, '\\\\')
            .replace(/\|/g, '\\|'),
        ),
    )
    .filter((row) => row.length > 0)
  if (rows.length === 0) return ''

  const width = Math.max(...rows.map((row) => row.length))
  const normalized = rows.map((row) => [
    ...row,
    ...Array.from({ length: width - row.length }, () => ''),
  ])
  const render = (row) => `| ${row.join(' | ')} |`
  return [
    render(normalized[0]),
    render(Array.from({ length: width }, () => '---')),
    ...normalized.slice(1).map(render),
  ].join('\n')
}

const renderMarkdown = (html, canonical) => {
  const { document } = parseHTML(html)
  const source =
    document.querySelector('[data-agent-content]') ??
    document.querySelector('main')
  if (!source) throw new Error(`Missing main content for ${canonical}`)

  const root = source.cloneNode(true)
  for (const labelled of root.querySelectorAll('[aria-label]')) {
    if (!(labelled.textContent ?? '').trim()) {
      labelled.textContent = labelled.getAttribute('aria-label') ?? ''
    }
  }
  for (const selector of exclusions) {
    for (const element of root.querySelectorAll(selector)) element.remove()
  }
  for (const element of root.querySelectorAll('[href], [src]')) {
    for (const attribute of ['href', 'src']) {
      const value = element.getAttribute(attribute)
      if (!value || value.startsWith('#')) continue
      try {
        element.setAttribute(attribute, new URL(value, canonical).toString())
      } catch {}
    }
  }

  const service = new TurndownService({
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    fence: '```',
    headingStyle: 'atx',
    strongDelimiter: '**',
  })
  service.addRule('languageFence', {
    filter: (node) =>
      node.nodeName === 'PRE' &&
      Boolean(
        node.getAttribute('data-language') ||
          node.querySelector('code[class*="language-"]'),
      ),
    replacement: (_content, node) => {
      const code = node.querySelector('code')
      const language =
        node.getAttribute('data-language') ??
        code?.getAttribute('class')?.match(/(?:^|\s)language-([^\s]+)/)?.[1] ??
        ''
      const value = (code?.textContent ?? '').replace(/\n$/, '')
      return `\n\n\`\`\`${language}\n${value}\n\`\`\`\n\n`
    },
  })
  service.addRule('tables', {
    filter: 'table',
    replacement: (_content, node) => {
      const table = tableMarkdown(node)
      return table ? `\n\n${table}\n\n` : ''
    },
  })

  const body = normalizeMarkdown(service.turndown(root.innerHTML))
  const h1Count = (body.match(/^#\s+/gm) ?? []).length
  if (h1Count !== 1) {
    throw new Error(`Expected one H1 for ${canonical}, found ${h1Count}`)
  }

  const title = document.querySelector('title')?.textContent?.trim()
  const description = document
    .querySelector('meta[name="description"]')
    ?.getAttribute('content')
    ?.trim()
  if (!title || !description)
    throw new Error(`Missing metadata for ${canonical}`)

  const language = document.documentElement.getAttribute('lang')?.trim() || 'en'
  const markdown = [
    '---',
    `title: ${yaml(title)}`,
    `description: ${yaml(description)}`,
    `canonical: ${yaml(canonical)}`,
    `language: ${yaml(language)}`,
    '---',
    '',
    body,
  ].join('\n')

  return { markdown, title, description, language }
}

const injectAlternate = (html, markdownUrl) => {
  const tag = `<link rel="alternate" type="text/markdown" href="${markdownUrl}">`
  if (html.includes(tag)) return html
  if (!html.includes('</head>'))
    throw new Error('Built page is missing </head>')
  return html.replace('</head>', `${tag}</head>`)
}

const pages = []
for (const htmlFile of await walkHtml(output)) {
  const relativeHtml = path.relative(output, htmlFile).split(path.sep).join('/')
  if (/^(?:404|500)(?:\/index)?\.html$/.test(relativeHtml)) continue

  const html = await readFile(htmlFile, 'utf8')
  const { document } = parseHTML(html)
  const canonicalValue = document
    .querySelector('link[rel="canonical"]')
    ?.getAttribute('href')
  if (!canonicalValue) throw new Error(`Missing canonical in ${relativeHtml}`)

  const canonical = new URL(canonicalValue, site)
  if (canonical.origin !== site.origin) {
    throw new Error(`Canonical outside ${site.origin}: ${canonical}`)
  }
  const route = markdownRoute(canonical.pathname)
  const markdownUrl = new URL(route.path, site).toString()
  const rendered = renderMarkdown(html, canonical.toString())
  const markdownFile = path.join(output, route.file)
  await mkdir(path.dirname(markdownFile), { recursive: true })
  await writeFile(markdownFile, rendered.markdown, 'utf8')
  await writeFile(htmlFile, injectAlternate(html, markdownUrl), 'utf8')

  pages.push({
    bytes: Buffer.byteLength(rendered.markdown),
    canonical: canonical.toString(),
    description: rendered.description,
    htmlFile: relativeHtml,
    htmlPath: canonical.pathname,
    language: rendered.language,
    markdownFile: route.file.split(path.sep).join('/'),
    markdownPath: route.path,
    noindex: Boolean(
      document.querySelector('meta[name="robots"][content*="noindex"]'),
    ),
    sha256: sha256(rendered.markdown),
    title: rendered.title,
    tokens: Math.ceil(Buffer.byteLength(rendered.markdown) / 4),
  })
}
pages.sort((left, right) =>
  left.htmlPath.localeCompare(right.htmlPath, 'en-US'),
)

const manifest = { version: 1, site: site.origin, pages }
await writeFile(
  path.join(output, 'agent-routes.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
)

const pageByPath = new Map(pages.map((page) => [page.htmlPath, page]))
const llmsSections = [
  {
    heading: 'Start here',
    paths: ['/', '/docs/start', '/docs/mcp', '/docs/typescript'],
  },
  {
    heading: 'Use ilo',
    paths: [
      '/docs/audience-research',
      '/docs/articles',
      '/docs/cli',
      '/docs/reports',
      '/reports',
      '/tools',
    ],
  },
  {
    heading: 'Public X research',
    paths: [
      '/twitter-profile-analytics',
      '/twitter-search-without-account',
      '/twitter-thread-reader',
      '/blog',
    ],
  },
]
const llmsBody = llmsSections
  .map(({ heading, paths }) => {
    const items = paths.map((pathname) => {
      const page = pageByPath.get(pathname)
      if (!page)
        throw new Error(`llms.txt route missing from build: ${pathname}`)
      const label = page.title.replace(/\s+\|\s+ilo$/, '')
      return `- [${label}](${new URL(page.markdownPath, site)}): ${page.description}`
    })
    return `## ${heading}\n\n${items.join('\n')}`
  })
  .join('\n\n')

await mkdir(path.dirname(skillOutput), { recursive: true })
await cp(skillSource, skillOutput)
const skill = await readFile(skillSource)
const skillIndex = {
  $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
  skills: [
    {
      name: 'ilo',
      type: 'skill-md',
      description:
        'Use ilo for local social media drafting, X account setup, scheduling, publishing, and agent workflows.',
      url: '/.well-known/agent-skills/ilo/SKILL.md',
      digest: `sha256:${sha256(skill)}`,
    },
  ],
}
await writeFile(
  path.join(output, '.well-known', 'agent-skills', 'index.json'),
  `${JSON.stringify(skillIndex, null, 2)}\n`,
  'utf8',
)

await writeFile(
  path.join(output, 'llms.txt'),
  `# ilo\n\n> Agent-first X performance monitoring, drafting, scheduling, and publishing through an open source CLI, local MCP server, agent skill, and TypeScript package.\n\n${llmsBody}\n\n## Machine-readable capability\n\n- [Agent skill index](${new URL('/.well-known/agent-skills/index.json', site)}): Discover and verify the published ilo skill.\n- [ilo SKILL.md](${new URL('/.well-known/agent-skills/ilo/SKILL.md', site)}): Teach an agent when and how to use ilo safely.\n`,
  'utf8',
)

const existingHeadersPath = path.join(output, '_headers')
const existingHeaders = await readFile(existingHeadersPath, 'utf8').catch(
  () => '',
)
const globalHeaders = [
  '/*',
  `  Link: <${new URL('/sitemap.xml', site)}>; rel="sitemap"; type="application/xml"`,
  `  Link: <${new URL('/llms.txt', site)}>; rel="llms-txt"; type="text/markdown"`,
  `  Link: <${new URL('/.well-known/agent-skills/index.json', site)}>; rel="agent-skills"; type="application/json"`,
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '',
  '/llms.txt',
  '  Content-Type: text/markdown; charset=utf-8',
  '  Cache-Control: public, max-age=300, must-revalidate',
  '',
  '/agent-routes.json',
  '  Content-Type: application/json; charset=utf-8',
  '  Cache-Control: public, max-age=300, must-revalidate',
  '',
  '/.well-known/agent-skills/*',
  '  Access-Control-Allow-Origin: *',
  '  Cache-Control: public, max-age=300, must-revalidate',
].join('\n')
await writeFile(
  existingHeadersPath,
  `${existingHeaders.trim()}\n\n${globalHeaders}\n`,
  'utf8',
)

process.stdout.write(
  `Generated ${pages.length} static Markdown pages and the ilo agent skill.\n`,
)
