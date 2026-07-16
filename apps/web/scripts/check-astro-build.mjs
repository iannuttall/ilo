import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const serverDir = path.join(root, 'dist', 'server')
const entryPath = path.join(serverDir, 'entry.mjs')
const wranglerPath = path.join(serverDir, 'wrangler.json')
const devVarsPath = path.join(serverDir, '.dev.vars')
const clientDir = path.join(root, 'dist', 'client')
const cloudflareGuidePath = path.join(root, 'CLOUDFLARE.md')

const fail = (message) => {
  throw new Error(`Astro build check failed: ${message}`)
}
const exists = (filePath) =>
  stat(filePath).then(
    () => true,
    () => false,
  )

if (await exists(devVarsPath)) {
  fail('dist/server/.dev.vars must not be emitted')
}

for (const relativePath of [
  'index.html',
  'index.md',
  'docs/articles.md',
  'docs/mcp.md',
  'docs/typescript.md',
  'agent-routes.json',
  'llms.txt',
  '.well-known/agent-skills/index.json',
  '.well-known/agent-skills/ilo/SKILL.md',
]) {
  if (!(await exists(path.join(clientDir, relativePath)))) {
    fail(`static agent asset is missing: ${relativePath}`)
  }
}

const homeHtml = await readFile(path.join(clientDir, 'index.html'), 'utf8')
if (!homeHtml.includes('rel="alternate" type="text/markdown"')) {
  fail('static HTML is missing its Markdown alternate')
}
if (!homeHtml.includes('href="/docs/articles"')) {
  fail('homepage is missing its article monitoring docs link')
}

const mcpHtml = await readFile(
  path.join(clientDir, 'docs', 'mcp', 'index.html'),
  'utf8',
)
if (!mcpHtml.includes('data-code-copy')) {
  fail('documentation code blocks are missing copy buttons')
}

const agentManifest = JSON.parse(
  await readFile(path.join(clientDir, 'agent-routes.json'), 'utf8'),
)
if (agentManifest.version !== 1 || !Array.isArray(agentManifest.pages)) {
  fail('agent-routes.json is invalid')
}
const agentPaths = new Set(agentManifest.pages.map((page) => page.htmlPath))
const sitemap = await readFile(path.join(clientDir, 'sitemap.xml'), 'utf8')
const sitemapPaths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
  (match) => new URL(match[1]).pathname,
)
for (const pathname of sitemapPaths) {
  if (!agentPaths.has(pathname)) {
    fail(`sitemap route has no static Markdown page: ${pathname}`)
  }
}
if (sitemapPaths.includes('/docs/api')) {
  fail('/docs/api must stay out of the sitemap')
}

const cloudflareGuide = await readFile(cloudflareGuidePath, 'utf8')
for (const snippet of [
  'http.request.uri.path.extension eq ""',
  'http.request.uri.path ne "/api"',
  'not starts_with(http.request.uri.path, "/api/")',
  'http.request.uri.path ne "/docs/api"',
  'concat(http.request.uri.path, ".md")',
]) {
  if (!cloudflareGuide.includes(snippet)) {
    fail(`Cloudflare Markdown transform is missing: ${snippet}`)
  }
}

const entry = await readFile(entryPath, 'utf8')
for (const snippet of ['createIloWorker', 'async fetch(request, env, ctx)']) {
  if (!entry.includes(snippet)) fail(`entry.mjs is missing ${snippet}`)
}

const wrangler = JSON.parse(await readFile(wranglerPath, 'utf8'))
if (wrangler.main !== 'entry.mjs') fail('main must point at entry.mjs')
if (wrangler.assets?.binding !== 'ASSETS') fail('ASSETS binding is missing')
if (wrangler.assets?.directory !== '../client') {
  fail('asset directory must point at ../client')
}
if (wrangler.assets?.html_handling !== 'drop-trailing-slash') {
  fail('static HTML must keep extensionless canonical URLs')
}
if (Object.hasOwn(wrangler.assets ?? {}, 'run_worker_first')) {
  fail("run_worker_first must use Cloudflare's false default")
}
if (wrangler.cache?.enabled) {
  fail('Workers Caching must stay disabled for static asset traffic')
}
if (wrangler.observability?.enabled !== false) {
  fail('Worker observability must stay disabled')
}

const forbiddenBindings = [
  ['D1', wrangler.d1_databases],
  ['KV', wrangler.kv_namespaces],
  ['R2', wrangler.r2_buckets],
  ['queues', wrangler.queues?.producers],
  ['queue consumers', wrangler.queues?.consumers],
]
for (const [name, bindings] of forbiddenBindings) {
  if ((bindings ?? []).length > 0)
    fail(`generated config must not include ${name}`)
}
